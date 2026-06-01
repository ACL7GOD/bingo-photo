# Déploiement du Bingo Photo de A à Z

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

1. Connectez-vous à votre compte [Supabase](https://supabase.com/).
2. Créez un nouveau projet (définissez un mot de passe pour la base de données et conservez-le. Il est obligatoire à la création, même si nous n'en aurons pas besoin pour ce projet).
3. Dans le menu de gauche, cliquez sur **SQL Editor**.
4. Cliquez sur **New query** (Nouvelle requête).
5. Copiez et collez le code SQL ci-dessous, puis cliquez sur **Run** (Exécuter) en bas à droite :

*(Ce code permet de créer la table de jeu, de configurer les droits d'envoi et de suppression des photos dans le dossier de stockage, et de sécuriser l'accès pour que chacun ne puisse modifier que ses propres données).*

```sql
-- =========================================================================
-- 1. CONFIGURATION DE LA BASE DE DONNÉES
-- =========================================================================

-- Création de la table pour enregistrer les photos envoyées
CREATE TABLE IF NOT EXISTS public.bingo_cells (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cell_index integer NOT NULL,
    image_url text,
    user_email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT bingo_cells_user_id_cell_index_key UNIQUE (user_id, cell_index)
);

-- Activation de la sécurité RLS (Row Level Security) sur la table
ALTER TABLE public.bingo_cells ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Tout le monde peut voir les photos de tout le monde
CREATE POLICY "Lecture publique pour tous" 
ON public.bingo_cells FOR SELECT 
USING (true);

-- Politique d'écriture : Un joueur connecté peut ajouter/modifier ses propres photos
CREATE POLICY "Modifications par le propriétaire" 
ON public.bingo_cells FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 2. CONFIGURATION DU STOCKAGE ET DES DROITS (PHOTOS)
-- =========================================================================

-- Création automatique du dossier de stockage 'bingo-photos' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bingo-photos', 'bingo-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Autoriser la lecture publique des photos dans le dossier 'bingo-photos'
CREATE POLICY "Lecture publique des photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bingo-photos');

-- Autoriser l'envoi de photos uniquement pour les joueurs connectés et dans leur propre dossier (identifiant utilisateur)
CREATE POLICY "Envoi de photos par le propriétaire"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bingo-photos' AND auth.uid()::text = split_part(name, '/', 1));

-- Autoriser le joueur à supprimer ses propres photos
CREATE POLICY "Suppression de photos par le propriétaire"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bingo-photos' AND auth.uid()::text = split_part(name, '/', 1));
```

### 1.2 Vérifier la création du dossier de stockage (Bucket)

Grâce au script SQL de l'étape 1.1, le dossier de stockage a été généré automatiquement. Vous pouvez simplement vérifier sa présence :

1. Dans le menu de gauche de Supabase, cliquez sur **Storage**.
2. Assurez-vous qu'un dossier nommé `bingo-photos` est bien présent et qu'il possède la mention **Public**.

### 1.3 Désactiver la confirmation d'e-mail

Pour faciliter l'inscription, l'application demande uniquement un pseudo aux joueurs (et génère une adresse e-mail interne fictive). Il faut donc obligatoirement désactiver cette vérification car les joueurs n'ont pas de boîte mail pour recevoir de message de confirmation.

1. Dans le menu de gauche de Supabase, cliquez sur **Authentication** puis sur **Providers**.
2. Cliquez sur la section **Email** pour dérouler les options.
3. Désactivez l'interrupteur **Confirm email** (Confirmer l'e-mail).
4. Cliquez sur **Save** en bas de la page.

### 1.4 Récupérer les clés et lier l'application

1. Allez dans les paramètres de Supabase (icône d'engrenage en bas à gauche), puis cliquez sur **API**.
2. Copiez l'**Project URL** et la clé **anon (public)**.
3. Ouvrez le fichier `app.js` situé sur votre ordinateur et remplacez les valeurs tout en haut (lignes 2 et 3) par vos clés :
   ```javascript
   const SUPABASE_URL = "VOTRE_PROJECT_URL_ICI";
   const SUPABASE_KEY = "VOTRE_CLE_ANON_ICI";
   ```

> [!NOTE]
> **Project URL :** 
> - Il s'agit de l'adresse technique de votre base de données Supabase (de la forme `https://xxx.supabase.co`). Ce **n'est pas** l'adresse finale du site web sur laquelle les joueurs se connecteront. Celle-ci sera générée à l'étape 3 (lors de l'hébergement sur Vercel).

> [!IMPORTANT]
> **Sécurité des clés :**
> - La clé **`anon (public)`** est conçue pour être intégrée directement dans le code du site. Elle est publique et peut être partagée sans danger car la sécurité est gérée par les règles SQL configurées à l'étape 1.1.
> - Ne confondez pas et n'utilisez **jamais** la clé **`service_role`** (qui se trouve juste en dessous dans votre console). Cette clé contourne toutes les sécurités et donne un accès administrateur total. Elle doit rester strictement secrète.

---

## 2. Hébergement du code sur GitHub

GitHub permettra de stocker le code de votre projet et de le lier à Vercel pour le rendre accessible en ligne.

1. Allez sur [GitHub](https://github.com/) et créez un compte gratuit.
2. Créez un nouveau dépôt public (Repository).
3. Importez (uploadez) les fichiers suivants de votre projet (y compris votre fichier `app.js` modifié avec vos clés Supabase) :
   * `index.html`
   * `style.css`
   * `app.js`

---

## 3. Hébergement de l'interface sur Vercel

Vercel va héberger le site web du Bingo et le rendre accessible publiquement sur Internet. Il redéploiera automatiquement le site dès que vous ferez des modifications sur GitHub.

1. Allez sur [Vercel](https://vercel.com/) et connectez-vous avec votre compte GitHub (**Continue with GitHub**).
2. Une fois connecté, cliquez sur le bouton **Add New...** puis sur **Project**.
3. Importez le dépôt GitHub créé à l'étape 2.
4. Laissez toutes les configurations par défaut et cliquez sur **Deploy**.
5. Après quelques secondes, Vercel génère une adresse publique (basée par défaut sur le nom de votre dépôt GitHub, ex: `https://nom-du-repo.vercel.app`). C'est cette adresse qu'il faudra envoyer aux joueurs !

> [!TIP]
> **Personnaliser l'adresse de votre site (URL) :**
> Par défaut, Vercel génère un nom automatique. Pour choisir l'adresse de votre choix (ex: `https://bingo-tapages.vercel.app`) :
> 1. Sur la page d'accueil de Vercel, cliquez sur votre projet.
> 2. Sur la page d'accueil du projet (onglet **Overview**), repérez la section **Domains** sur la droite.
> 3. Cliquez sur le bouton **+** (ou sur le lien) situé à droite de **Domains**.
> 4. Saisissez le nom souhaité (ex: `bingo-tapages.vercel.app`), puis cliquez sur **Add** (Ajouter).
