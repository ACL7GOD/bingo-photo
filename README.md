# 📸 Bingo Photos

Une application web de Bingo Photo : 25 photos à trouver et envoyer pour remplir sa grille et gagner le plus de points !

![Aperçu de Bingo Tapages](https://iili.io/C3yhVZ7.png)

## À propos du projet

**Bingo Tapages** permet aux joueurs de relever des défis photo en remplissant une grille interactive de Bingo.

### Fonctionnalités principales :
- 📸 **Ta grille de Bingo** : Complète ta grille de 25 photos.
- 👥 **Les grilles de tous les joueurs** : Visualise les photos des autres joueurs.
- 🏆 **Classement en temps réel** : Classement pour suivre la progression des participants.
- 💬 **Réactions émojis** : Ajout d'émojis sur les photos des autres joueurs.
- 📱 **Interface pour mobile** : Optimisée pour participer csur mobile.

---

# 🚀 Déploiement

Ce guide vous accompagne pas à pas pour déployer et configurer une nouvelle instance du Bingo Photo.

## Les outils utilisés et leurs rôles

Pour faire fonctionner ce Bingo, nous allons utiliser trois services gratuits :
*   **Supabase** : C'est notre base de données, notre gestionnaire d'accès et notre espace de stockage. Ce service gère l'inscription et la connexion des joueurs, enregistre les grilles de bingo de chaque joueur et stocke les photos envoyées.
*   **GitHub** : C'est la plateforme en ligne qui stocke et sauvegarde le code de notre application (`index.html`, `style.css`, `app.js`). C'est depuis cet espace que l'hébergeur récupérera les fichiers pour les mettre en ligne.
*   **Vercel** : C'est l'hébergeur qui rend notre site accessible sur internet. Il est connecté à GitHub pour publier automatiquement le site en ligne et fournir un lien de partage (URL) pour les joueurs.

---

## 1. Configuration de Supabase

Supabase sert d'espace d'authentification (pour gérer les comptes des joueurs), de base de données (pour enregistrer l'état des grilles) et d'espace de stockage (pour sauvegarder les photos).

### 1.1 Configurer la base de données (SQL Editor)

1. Créez un compte et connectez-vous sur [Supabase](https://supabase.com/).
2. Créez un nouveau projet en laissant les options par défaut. Définissez un mot de passe pour la base de données. (Notez-le de côté par sécurité, mais sachez que nous n'en aurons pas besoin pour ce projet. Si vous le perdez, vous pourrez le réinitialiser à tout moment dans les paramètres de Supabase).
3. Dans le menu de gauche, cliquez sur **SQL Editor** (ou sur le raccourci en haut à droite)
4. Copiez et collez le code SQL ci-dessous, puis cliquez sur **Run** (Exécuter) en bas à droite :

*(Ce code permet de créer la table de jeu, de configurer les droits d'envoi et de suppression des photos dans le dossier de stockage, et de sécuriser l'accès pour que chacun ne puisse modifier que ses propres données).*

```sql
-- =========================================================================
-- 1. GESTION DES PROFILS ET DE LA VALIDATION DES COMPTES
-- =========================================================================

-- Création de la table 'profiles' pour suivre le statut d'approbation de chaque joueur
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contrainte d'unicité sur le pseudo (insensible à la casse)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

-- Activation de la sécurité RLS sur la table des profils
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Tout le monde peut voir les profils (utile pour afficher les pseudos dans le classement)
CREATE POLICY "Lecture des profils pour tous" 
ON public.profiles FOR SELECT 
USING (true);

-- Fonction automatique exécutée à chaque inscription pour créer son profil (en attente d'approbation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, approved)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    false -- Bloqué (Faux) par défaut jusqu'à validation de l'administrateur
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour déclencher automatiquement la fonction ci-dessus à l'inscription
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 2. CONFIGURATION DE LA TABLE DE JEU (BINGO)
-- =========================================================================

-- Création de la table pour enregistrer les photos envoyées par case
CREATE TABLE IF NOT EXISTS public.bingo_cells (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cell_index integer NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT bingo_cells_user_id_cell_index_key UNIQUE (user_id, cell_index)
);

-- Activation de la sécurité RLS sur la table de bingo
ALTER TABLE public.bingo_cells ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Uniquement les joueurs connectés ET approuvés peuvent voir les grilles et photos
CREATE POLICY "Lecture réservée aux joueurs approuvés" 
ON public.bingo_cells FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- Politique d'écriture : Seuls les joueurs connectés, approuvés, et propriétaires de leur grille peuvent écrire
CREATE POLICY "Modifications réservées aux propriétaires approuvés" 
ON public.bingo_cells FOR ALL 
TO authenticated 
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
) 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- =========================================================================
-- 3. CONFIGURATION DU STOCKAGE ET DES DROITS (PHOTOS)
-- =========================================================================

-- Création automatique du dossier de stockage 'bingo-photos' s'il n'existe pas (Le bucket est PRIVÉ)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bingo-photos', 'bingo-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Autoriser la lecture des photos du dossier uniquement aux utilisateurs connectés et approuvés
CREATE POLICY "Lecture des photos réservée aux approuvés"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'bingo-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- Autoriser l'envoi de photos uniquement pour les joueurs connectés, approuvés et dans leur propre sous-dossier
CREATE POLICY "Envoi de photos réservé aux approuvés"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bingo-photos' AND 
  auth.uid()::text = split_part(name, '/', 1) AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- Autoriser la suppression de ses propres photos uniquement si le compte est toujours approuvé
CREATE POLICY "Suppression de photos par le propriétaire approuvé"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bingo-photos' AND 
  auth.uid()::text = split_part(name, '/', 1) AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- =========================================================================
-- 4. CONFIGURATION DES REACTIONS (EMOJIS)
-- =========================================================================

-- Création de la table pour les réactions
CREATE TABLE IF NOT EXISTS public.photo_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bingo_cell_id uuid REFERENCES public.bingo_cells(id) ON DELETE CASCADE NOT NULL,
    reactor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT photo_reactions_cell_reactor_key UNIQUE (bingo_cell_id, reactor_id)
);

-- Activation RLS
ALTER TABLE public.photo_reactions ENABLE ROW LEVEL SECURITY;

-- Lecture des réactions pour les joueurs approuvés
CREATE POLICY "Lecture réservée aux joueurs approuvés (reactions)"
ON public.photo_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- Insertion autorisée aux joueurs approuvés (et avec leur propre ID)
CREATE POLICY "Insertion de reactions (joueurs approuvés)"
ON public.photo_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reactor_id AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.approved = true
  )
);

-- Modification (Upsert) et suppression de ses propres réactions
CREATE POLICY "Modification de ses propres reactions"
ON public.photo_reactions FOR UPDATE
TO authenticated
USING (
  auth.uid() = reactor_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.approved = true)
)
WITH CHECK (
  auth.uid() = reactor_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.approved = true)
);

CREATE POLICY "Suppression de ses propres reactions"
ON public.photo_reactions FOR DELETE
TO authenticated
USING (
  auth.uid() = reactor_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.approved = true)
);
```

### 1.2 Vérifier la création du dossier de stockage (Bucket)

Grâce au script SQL de l'étape 1.1, le dossier de stockage a été généré automatiquement. Vous pouvez simplement vérifier sa présence :

1. Dans le menu de gauche de Supabase, cliquez sur **Storage**.
2. Assurez-vous qu'un dossier nommé `bingo-photos` est bien présent et qu'il est configuré en tant que **Private** (Privé) pour la sécurité des données.

### 1.3 Désactiver la validation d'e-mail des joueurs

Pour faciliter l'inscription, l'application demande uniquement un pseudo aux joueurs (et génère une adresse e-mail interne fictive). Il faut donc obligatoirement désactiver cette vérification car les joueurs n'ont pas de boîte mail pour recevoir de message de validation.

1. Dans le menu de gauche de Supabase, cliquez sur **Authentication** puis sur **Sign in / Providers**.
2. Dans l'onglet **Supabase Auth**, sous la section **User Signups**, désactivez l'interrupteur **Confirm email**.
3. Cliquez sur le bouton vert **Save changes** situé en bas à droite.

### 1.4 Récupérer les clés et lier l'application

1. Allez dans les paramètres de Supabase (icône d'engrenage en bas à gauche).
2. Récupérez vos identifiants :
   - **Project ID** (ou *Reference ID*) : C'est le code de lettres et chiffres unique de votre projet (par exemple `zgdjtfyidavwtphfrrvf`). Vous pouvez le copier directement depuis l'URL de votre navigateur dans votre tableau de bord Supabase (situé entre `project/` et le slash suivant) ou dans l'onglet **General** des paramètres.
   - **Publishable key** (clé publiable) : Allez dans la section **API Keys** à gauche, puis copiez la clé nommée **default** sous le titre **Publishable key** (elle commence par `sb_publishable_...`).
3. Ouvrez le fichier `app.js` situé sur votre ordinateur et remplacez les valeurs tout en haut (lignes 2 et 3) par vos clés :
   ```javascript
   const SUPABASE_PROJECT_ID = "VOTRE_PROJECT_ID_ICI";
   const SUPABASE_KEY = "VOTRE_CLE_PUBLIABLE_ICI";
   ```

> [!WARNING]
> Ne confondez pas et n'utilisez **jamais** la clé **`Secret key`** (qui commence par `sb_secret_...`). Cette clé contourne toutes les sécurités et donne un accès administrateur total. Elle doit rester strictement secrète.

### 1.5 Valider et activer les joueurs (Administrateur)

> [!NOTE]
> **Cette étape n'est pas à réaliser immédiatement.**
> Vous y reviendrez plus tard, une fois que l'application sera déployée et que les joueurs auront commencé à s'inscrire.

Par défaut, tous les nouveaux inscrits ont la case `approved` à `false` (Désactivé) et ne peuvent rien voir ni envoyer de photos (leurs requêtes de chargement de grille renverront une grille vide).

Pour autoriser un nouveau joueur à participer :
1. Connectez-vous sur votre console [Supabase](https://supabase.com/).
2. Dans le menu de gauche, cliquez sur **Table Editor** (icône de table de données).
3. Sélectionnez la table **`profiles`** dans la liste.
4. Vous y verrez tous les comptes créés avec leur pseudo. Pour activer un joueur, double-cliquez sur sa case **`approved`** pour la cocher (la passer à `true`).
5. Dès que c'est fait, le joueur peut rafraîchir sa page pour accéder instantanément au Bingo et commencer à jouer !

---

## 2. Hébergement du code sur GitHub

GitHub permettra de stocker le code de votre projet et de le lier à Vercel pour le rendre accessible en ligne.

1. Allez sur [GitHub](https://github.com/) et créez un compte gratuit.
2. Créez un nouveau dépôt public (Repository).
3. Importez (uploadez) les fichiers suivants de votre projet (après avoir modifié votre fichier `app.js` avec vos clés Supabase) :
   * `index.html`
   * `style.css`
   * `app.js`

---

## 3. Hébergement de l'interface sur Vercel

Vercel va héberger le site web du Bingo et le rendre accessible publiquement sur Internet. Il redéploiera automatiquement le site dès que vous ferez des modifications sur GitHub.

1. Allez sur [Vercel](https://vercel.com/) et connectez-vous avec votre compte GitHub (**Continue with GitHub**).
2. Allez sur [Vercel New Project](https://vercel.com/). Sous la section **Import Git Repository** à gauche, cliquez sur le bouton **Continue with GitHub** (si on vous le demande) puis **Install** pour autoriser Vercel à voir le code sur votre Github. Si vous avez plusieurs repositories, vous pouvez choisir *Only select repositories* pour ne donner accès qu'au dépôt **`bingo-photo`**, puis cliquez sur le bouton **Install**.
3. Une fois que le repo apparait dans Vercel, cliquez sur **Import**.
   - *(Optionnel)* Dans le champ **Project Name**, vous pouvez modifier le nom par défaut (`bingo-photo`). C'est ce nom qui déterminera l'adresse web par défaut de votre site (par exemple, en saisissant `bingo-tapages`, votre site aura l'adresse `https://bingo-tapages.vercel.app`).
   - Laissez toutes les autres configurations par défaut et cliquez sur le bouton **Deploy** (Déployer).
4. Après quelques secondes, Vercel aura déployé le site. Vous pouvez retourner sur [Vercel](https://vercel.com/), cliquer sur votre projet et voir l'URL sous *Domains* à partager aux joueurs. Si nécessaire, vous pouvez ajouter un nom personnalisé en cliquant sur le bouton **+** (ou sur le lien) situé à droite de **Domains**, saisir le nom souhaité (ex: `bingo-tapages.vercel.app`), puis cliquer sur **Add** (Ajouter).

---

## 🎉 C'est prêt !

Votre Bingo Photo est maintenant entièrement fonctionnel et en ligne. Vous pouvez partager l'adresse finale de Vercel avec vos joueurs.

> [!IMPORTANT]
> **Rappel de validation :**
> N'oubliez pas de retourner à la section **[1.5 Valider et activer les joueurs](#15-valider-et-activer-les-joueurs-administrateur)** pour activer les comptes de vos joueurs dès qu'ils se seront inscrits pour la première fois !

---

Made with ❤️ by [Tapages Fanfare](https://www.instagram.com/tapagesfanfare/)
