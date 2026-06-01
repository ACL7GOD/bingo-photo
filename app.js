// --- CONFIGURATION --- 
const SUPABASE_PROJECT_ID = "zgdjtfyidavwtphfrrvf";
const SUPABASE_KEY = "sb_publishable_4sW5qMxacEbyWez5TruoAQ_lCQAfJl5";
const supabaseClient = supabase.createClient(`https://${SUPABASE_PROJECT_ID}.supabase.co`, SUPABASE_KEY);

let currentUser = null;
let selectedIdx = null;
const bingoItems = [
    { title: "Un chien dans une voiture", emoji: "🐶🚗" },
    { title: "Du love chez les Tapages", emoji: "❤️" },
    { title: "Tes pieds dans les chaussures d'un autre Tapage", emoji: "👞" },
    { title: "Un Tapage pas encore couché au lever du soleil", emoji: "🥱" },
    { title: "Un selfie grimace avec un autre Tapage", emoji: "🥸" },
    { title: "Un repas de croûtard", emoji: "🐀" },
    { title: "Un personnage de Shrek dans la vraie vie", emoji: "🧌👹" },
    { title: "Un panneau qui fait penser aux Tapages", emoji: "🪧" },
    { title: "Une boîte d'Oeufs (ceux qui se mangent)", emoji: "🥚" },
    { title: "Un Tapage qui cherche quelque chose qu'iel a perdu", emoji: "👓" },
    { title: "Le sosie d'un Tapages", emoji: "👥" },
    { title: "Un selfie avec un animal", emoji: "👤🐒" },
    { title: "Ton magnifique vernis", emoji: "💅" },
    { title: "Un Tapage qui ne joue pas du bon instrument", emoji: "🎷🎺🖇️🥁" },
    { title: "Du munster (le fromage)", emoji: "🧀" },
    { title: "Deux Tapages sur un vélo", emoji: "👥🚴" },
    { title: "Un batiment historique", emoji: "🏦" },
    { title: "Un Tapage en claquettes/tongs + chaussettes", emoji: "🩴🧦" },
    { title: "Une paréidolie", emoji: "😀" },
    { title: "Le sticker Tapages dans un lieu insolite", emoji: "🧐" },
    { title: "Météo émotionnelle", emoji: "🌤️" },
    { title: "Un tire sur mon doigt", emoji: "👉🤏" },
    { title: "Un tout petit animal", emoji: "🪳" },
    { title: "Un selfie de pupitre (Sissa tu peux venir avec les Sax)", emoji: "👯‍♂️" },
    { title: "Un Tapage qui dort au soleil", emoji: "😴🌞" }
];

// --- INITIALISATION ---
window.onload = () => {
    checkUser();
    setupEventListeners();
};

function setupEventListeners() {
    const pseudoInput = document.getElementById('auth-pseudo');
    if (pseudoInput) {
        pseudoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkPseudo();
        });
    }

    const loginPass = document.getElementById('login-password');
    if (loginPass) {
        loginPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    const signupPass = document.getElementById('signup-password');
    if (signupPass) {
        signupPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSignup();
        });
    }
}

// --- NOTIFICATIONS (TOASTS) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- MODALS DE CONFIRMATION ---
/**
 * Affiche un modal de confirmation personnalisé
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise
 */
function showConfirm(message, title = "Confirmation") {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        const btnCancel = document.getElementById('modal-btn-cancel');

        titleEl.innerText = title;
        messageEl.innerText = message;
        overlay.classList.remove('hidden');

        const cleanup = (result) => {
            overlay.classList.add('hidden');
            btnConfirm.removeEventListener('click', onConfirm);
            btnCancel.removeEventListener('click', onCancel);
            resolve(result);
        };

        const onConfirm = () => cleanup(true);
        const onCancel = () => cleanup(false);

        btnConfirm.addEventListener('click', onConfirm);
        btnCancel.addEventListener('click', onCancel);
    });
}

// --- AUTHENTIFICATION ---
async function checkPseudo() {
    const pseudoInput = document.getElementById('auth-pseudo');
    const pseudo = pseudoInput.value.trim();
    if (!pseudo) return showToast("Saisis ton pseudo !", "error");

    try {
        // Recherche insensible à la casse du pseudo dans la table des profils publics
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('username')
            .ilike('username', pseudo)
            .maybeSingle();

        if (error) throw error;

        // Masquer l'étape 1 (Saisie du pseudo)
        document.getElementById('auth-step-pseudo').classList.add('hidden');

        if (data) {
            // Le pseudo existe -> Aller à l'écran de Connexion
            document.getElementById('login-pseudo-display').innerText = data.username;
            document.getElementById('auth-step-login').classList.remove('hidden');
            document.getElementById('login-password').value = '';
            document.getElementById('login-password').focus();
        } else {
            // Le pseudo n'existe pas -> Aller à l'écran d'Inscription
            document.getElementById('signup-pseudo-display').innerText = pseudo;
            document.getElementById('auth-step-signup').classList.remove('hidden');
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-password').focus();
        }
    } catch (err) {
        console.error("Erreur de vérification du pseudo :", err);
        showToast("Erreur lors de la vérification du pseudo", "error");
    }
}

function goBackToPseudo() {
    document.getElementById('auth-step-login').classList.add('hidden');
    document.getElementById('auth-step-signup').classList.add('hidden');
    document.getElementById('auth-step-pseudo').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('auth-pseudo').focus();
}

async function handleLogin() {
    const pseudo = document.getElementById('login-pseudo-display').innerText.trim();
    const password = document.getElementById('login-password').value;

    if (!pseudo || !password) return showToast("Remplis tous les champs !", "error");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: `${pseudo}@tapages.cool`,
        password: password
    });

    if (error) showToast("Erreur : Pseudo ou mot de passe incorrect", "error");
    else {
        showToast("Connexion réussie !");
        checkUser();
    }
}

async function handleSignup() {
    const pseudo = document.getElementById('signup-pseudo-display').innerText.trim();
    const password = document.getElementById('signup-password').value;

    if (!pseudo || !password) return showToast("Remplis tous les champs !", "error");

    const { error } = await supabaseClient.auth.signUp({
        email: `${pseudo}@tapages.cool`,
        password: password,
        options: {
            data: {
                username: pseudo
            }
        }
    });

    if (error) showToast(error.message, "error");
    else {
        showToast("Inscription réussie !", "success");
        // Connexion automatique après inscription (Supabase connecte automatiquement l'utilisateur à l'inscription)
        checkUser();
    }
}

async function handleLogout() {
    const confirmed = await showConfirm("Veux-tu vraiment te déconnecter ?", "Déconnexion");
    if (!confirmed) return;

    await supabaseClient.auth.signOut();
    location.reload();
}

function formatDisplayName(name) {
    if (!name) return 'Joueur anonyme';
    if (name.includes('@')) {
        return name.split('@')[0];
    }
    return name;
}

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        currentUser = user;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('game-section').style.display = 'block';

        const displayName = formatDisplayName(user.user_metadata?.username || user.email);
        document.getElementById('welcome-msg').innerText = `Salut, ${displayName} !`;

        // Vérifier si le compte est validé dans la table profiles
        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('approved')
                .eq('id', user.id)
                .single();

            if (profile && profile.approved) {
                // Le compte est approuvé : afficher le jeu
                document.getElementById('game-content-wrapper').style.display = 'block';
                document.getElementById('approval-pending-section').style.display = 'none';
                switchTab('perso');
            } else {
                // Le compte est en attente : afficher l'écran d'attente
                document.getElementById('game-content-wrapper').style.display = 'none';
                document.getElementById('approval-pending-section').style.display = 'block';
            }
        } catch (err) {
            console.error("Erreur lors de la vérification du profil :", err);
            // Par sécurité, on cache le jeu si la requête échoue
            document.getElementById('game-content-wrapper').style.display = 'none';
            document.getElementById('approval-pending-section').style.display = 'block';
        }
    }
}

// --- UI / NAVIGATION ---
function showSignup() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('signup-view').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('signup-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
}

function switchTab(tab) {
    const persoGrid = document.getElementById('perso-grid-container');
    const globalGrid = document.getElementById('global-grid-container');
    const leaderboardCont = document.getElementById('leaderboard-container');
    const userViewCont = document.getElementById('user-view-container');

    const tabPerso = document.getElementById('tab-perso');
    const tabGlobal = document.getElementById('tab-global');
    const tabLeaderboard = document.getElementById('tab-leaderboard');

    // Mascher tout
    persoGrid.classList.add('hidden');
    globalGrid.classList.add('hidden');
    leaderboardCont.classList.add('hidden');
    userViewCont.classList.add('hidden');

    tabPerso.classList.remove('active');
    tabGlobal.classList.remove('active');
    tabLeaderboard.classList.remove('active');

    if (tab === 'perso') {
        persoGrid.classList.remove('hidden');
        tabPerso.classList.add('active');
        loadGrid();
    } else if (tab === 'global') {
        globalGrid.classList.remove('hidden');
        tabGlobal.classList.add('active');
        loadGlobalGrid();
    } else if (tab === 'leaderboard') {
        leaderboardCont.classList.remove('hidden');
        tabLeaderboard.classList.add('active');
        loadLeaderboard();
    }
}

// --- LOGIQUE BINGO PERSO ---
async function loadGrid() {
    const { data: cells } = await supabaseClient.from('bingo_cells').select('*').eq('user_id', currentUser.id);
    const gridDiv = document.getElementById('grid');
    gridDiv.innerHTML = '';

    for (let i = 0; i < 25; i++) {
        const cellData = cells.find(c => c.cell_index === i);
        const cell = document.createElement('div');
        cell.className = 'cell' + (cellData ? ' completed' : '');

        if (cellData) {
            cell.innerHTML = `<img src="${cellData.image_url}">`;
        } else {
            cell.innerHTML = `<div class="cell-label">${bingoItems[i].emoji}</div>`;
        }

        // Toutes les cases sont cliquables pour ajout ou modification/suppression
        cell.onclick = () => openUpload(i, !!cellData, cellData ? cellData.image_url : null);
        gridDiv.appendChild(cell);
    }
}

// --- LOGIQUE BINGO COMMUNAUTAIRE ---
async function loadGlobalGrid() {
    const { data: allCells } = await supabaseClient.from('bingo_cells').select('cell_index');
    const globalGridDiv = document.getElementById('global-grid');
    globalGridDiv.innerHTML = '';

    // Compter les soumissions par index
    const counts = {};
    allCells.forEach(c => {
        counts[c.cell_index] = (counts[c.cell_index] || 0) + 1;
    });

    for (let i = 0; i < 25; i++) {
        const count = counts[i] || 0;
        const cell = document.createElement('div');
        cell.className = 'cell global-cell';

        // Effet de couleur selon le nombre (max 10 pour l'intensité max)
        const intensity = Math.min(count * 10, 50);
        if (count > 0) {
            cell.style.backgroundColor = `rgba(0, 123, 255, ${intensity / 100})`;
            cell.innerHTML = `<div class="badge">${count}</div><div class="cell-label">${bingoItems[i].emoji}</div>`;
            cell.onclick = () => showCellGallery(i);
        } else {
            cell.innerHTML = `<div class="cell-label">${bingoItems[i].emoji}</div>`;
        }

        globalGridDiv.appendChild(cell);
    }
}

async function showCellGallery(idx) {
    const { data: submissions } = await supabaseClient
        .from('bingo_cells')
        .select('id, image_url, user_email')
        .eq('cell_index', idx);

    const overlay = document.getElementById('gallery-overlay');
    const galleryTitle = document.getElementById('gallery-title');
    const galleryContent = document.getElementById('gallery-content');

    galleryTitle.innerText = `${bingoItems[idx].emoji} ${bingoItems[idx].title}`;
    galleryContent.innerHTML = '';

    submissions.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${sub.image_url}">
            <p class="user-email">${formatDisplayName(sub.user_email)}</p>
            <div class="reactions-container" id="reactions-${sub.id}"></div>
        `;
        galleryContent.appendChild(item);
        loadReactions(sub.id, `reactions-${sub.id}`);
    });

    overlay.classList.remove('hidden');
}

// --- CLASSEMENT (LEADERBOARD) ---
function calculateBingos(indices) {
    const lines = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], // H
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], // V
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20] // D
    ];
    let count = 0;
    lines.forEach(line => {
        if (line.every(idx => indices.includes(idx))) count++;
    });
    return count;
}

async function loadLeaderboard() {
    const { data: allSubmissions } = await supabaseClient.from('bingo_cells').select('user_id, user_email, cell_index');
    const listDiv = document.getElementById('leaderboard-list');
    listDiv.innerHTML = '<p>Chargement du classement...</p>';

    // Grouper par utilisateur
    const usersMap = {};
    allSubmissions.forEach(s => {
        if (!usersMap[s.user_id]) {
            usersMap[s.user_id] = {
                email: s.user_email || 'Joueur anonyme',
                indices: []
            };
        }
        usersMap[s.user_id].indices.push(s.cell_index);
    });

    // Calculer scores et bingos
    const sortedUsers = Object.keys(usersMap).map(id => {
        const u = usersMap[id];
        return {
            id: id,
            email: u.email,
            points: u.indices.length,
            bingos: calculateBingos(u.indices)
        };
    }).sort((a, b) => {
        if (b.bingos !== a.bingos) return b.bingos - a.bingos;
        return b.points - a.points;
    });

    listDiv.innerHTML = '';
    if (sortedUsers.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-muted); margin-top: 20px;">Aucun joueur pour le moment 😢</p>';
        return;
    }

    sortedUsers.forEach((user, idx) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        const displayName = formatDisplayName(user.email);
        item.onclick = () => viewUserGrid(user.id, displayName);

        item.innerHTML = `
            <div class="leaderboard-rank">${idx + 1}</div>
            <div class="leaderboard-name">${displayName}</div>
            <div class="leaderboard-score">${user.bingos} Bingo${user.bingos > 1 ? 's' : ''} (${user.points} 🖼️)</div>
        `;
        listDiv.appendChild(item);
    });
}

async function viewUserGrid(userId, userEmail) {
    document.getElementById('leaderboard-container').classList.add('hidden');
    document.getElementById('user-view-container').classList.remove('hidden');
    document.getElementById('user-view-title').innerText = `Bingo de ${userEmail}`;
    document.getElementById('user-photo-preview').classList.add('hidden'); // Reset preview

    const { data: cells } = await supabaseClient.from('bingo_cells').select('*').eq('user_id', userId);
    const gridDiv = document.getElementById('user-grid');
    gridDiv.innerHTML = '';

    for (let i = 0; i < 25; i++) {
        const cellData = cells.find(c => c.cell_index === i);
        const cell = document.createElement('div');
        cell.className = 'cell' + (cellData ? ' completed' : '');

        if (cellData) {
            cell.innerHTML = `<img src="${cellData.image_url}">`;
            cell.onclick = () => showUserPhoto(cellData.id, cellData.image_url, bingoItems[i].title);
        } else {
            cell.innerHTML = `<div class="cell-label">${bingoItems[i].emoji}</div>`;
        }

        gridDiv.appendChild(cell);
    }
}

function showUserPhoto(id, url, title) {
    const preview = document.getElementById('user-photo-preview');
    document.getElementById('user-photo-title').innerText = title;
    document.getElementById('user-photo-img').src = url;
    preview.classList.remove('hidden');
    preview.scrollIntoView({ behavior: 'smooth' });
    loadReactions(id, 'user-photo-reactions');
}

function closeUserGrid() {
    document.getElementById('user-view-container').classList.add('hidden');
    document.getElementById('leaderboard-container').classList.remove('hidden');
}

function closeGallery() {
    document.getElementById('gallery-overlay').classList.add('hidden');
}

// --- UPLOAD ---
function openUpload(idx, isCompleted = false, imageUrl = null) {
    selectedIdx = idx;
    document.getElementById('task-title').innerText = bingoItems[idx].title;
    document.getElementById('upload-zone').style.display = 'block';

    // Reset sections
    const previewSection = document.getElementById('upload-preview-section');
    const inputSection = document.getElementById('upload-input-section');

    if (isCompleted && imageUrl) {
        document.getElementById('upload-preview-img').src = imageUrl;
        previewSection.style.display = 'block';
        inputSection.style.display = 'none';
        document.getElementById('btn-delete').style.display = 'block';
    } else {
        previewSection.style.display = 'none';
        inputSection.style.display = 'block';
        document.getElementById('btn-delete').style.display = 'none';
    }

    // Scroller vers la zone d'upload pour plus de confort sur mobile
    document.getElementById('upload-zone').scrollIntoView({ behavior: 'smooth' });
}

function showUploadInput() {
    document.getElementById('upload-preview-section').style.display = 'none';
    document.getElementById('upload-input-section').style.display = 'block';
}

function closeUpload() {
    document.getElementById('upload-zone').style.display = 'none';
}

async function deletePhoto() {
    const confirmed = await showConfirm("Veux-tu vraiment supprimer cette photo ?", "Suppression");
    if (!confirmed) return;

    const { error } = await supabaseClient
        .from('bingo_cells')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('cell_index', selectedIdx);

    if (error) showToast("Erreur suppression : " + error.message, "error");
    else {
        showToast("Photo supprimée !");
        closeUpload();
        loadGrid();
    }
}

/**
 * Compresse une image côté client avant l'upload
 */
function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src); // Nettoyage mémoire
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calcul du redimensionnement proportionnel
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(blob => {
                if (blob) {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    console.log(`Compression: ${Math.round(file.size / 1024)}KB -> ${Math.round(compressedFile.size / 1024)}KB (${Math.round((compressedFile.size / file.size) * 100)}%)`);
                    resolve(compressedFile);
                } else {
                    reject(new Error("Erreur de compression (Blob)"));
                }
            }, 'image/jpeg', quality);
        };
        img.onerror = (err) => reject(new Error("Erreur de chargement de l'image pour compression"));
        img.src = URL.createObjectURL(file);
    });
}

async function uploadPhoto() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if (!file) return showToast("Choisis une photo !", "error");

    showToast("Traitement de l'image...");

    try {
        const compressedFile = await compressImage(file);
        const fileName = `${currentUser.id}/${selectedIdx}_${Date.now()}.jpg`;

        const { data, error: uploadError } = await supabaseClient.storage
            .from('bingo-photos')
            .upload(fileName, compressedFile, {
                cacheControl: '31536000', // Cache pour 1 an (en secondes)
                upsert: false
            });

        if (uploadError) return showToast("Erreur upload : " + uploadError.message, "error");

        const { data: { publicUrl } } = supabaseClient.storage.from('bingo-photos').getPublicUrl(fileName);

        const displayName = currentUser.user_metadata?.username || currentUser.email;

        const { error: dbError } = await supabaseClient.from('bingo_cells').upsert({
            user_id: currentUser.id,
            cell_index: selectedIdx,
            image_url: publicUrl,
            user_email: displayName
        }, { onConflict: 'user_id,cell_index' });

        if (dbError) showToast("Erreur DB : " + dbError.message, "error");
        else {
            showToast("Photo ajoutée ! 📸");
            fileInput.value = ""; // Vider l'input
            closeUpload();
            loadGrid();
        }
    } catch (err) {
        showToast("Erreur lors de la compression : " + err.message, "error");
        console.error(err);
    }
}

// Exposer les fonctions
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.checkPseudo = checkPseudo;
window.goBackToPseudo = goBackToPseudo;
window.uploadPhoto = uploadPhoto;
window.closeUpload = closeUpload;
window.switchTab = switchTab;
window.closeGallery = closeGallery;
window.showCellGallery = showCellGallery;
window.deletePhoto = deletePhoto;
window.closeUserGrid = closeUserGrid;
window.showUploadInput = showUploadInput;
window.showUserPhoto = showUserPhoto;

// --- EMOJI VALIDATION & REACTIONS ---

const emojiRegex = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]+$/u;
function isValidEmoji(str) {
    return typeof str === 'string' && str.trim() !== '' && emojiRegex.test(str.trim());
}

async function loadReactions(cellId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<span style="font-size: 12px; color: #888;">Chargement...</span>';

    const { data: reactions, error } = await supabaseClient
        .from('photo_reactions')
        .select('*')
        .eq('bingo_cell_id', cellId);

    if (error) {
        container.innerHTML = '';
        return;
    }

    const emojiCounts = {};
    const emojiReactors = {};
    let myReaction = null;

    reactions.forEach(r => {
        if (!isValidEmoji(r.emoji)) return; 
        
        if (!emojiCounts[r.emoji]) {
            emojiCounts[r.emoji] = 0;
            emojiReactors[r.emoji] = [];
        }
        emojiCounts[r.emoji]++;

        if (r.reactor_email) {
            emojiReactors[r.emoji].push(formatDisplayName(r.reactor_email));
        } else {
            emojiReactors[r.emoji].push("Anonyme");
        }

        if (currentUser && r.reactor_id === currentUser.id) {
            myReaction = r.emoji;
        }
    });

    renderReactions(cellId, containerId, emojiCounts, emojiReactors, myReaction);
}

function renderReactions(cellId, containerId, emojiCounts, emojiReactors, myReaction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    let allReactionsList = [];
    Object.keys(emojiReactors).forEach(emj => {
        emojiReactors[emj].forEach(name => {
            allReactionsList.push({ name: name, emoji: emj });
        });
    });

    Object.keys(emojiCounts).forEach(emoji => {
        const badge = document.createElement('div');
        const isMine = (emoji === myReaction);
        badge.className = 'reaction-badge' + (isMine ? ' reacted-by-me' : '');
        badge.innerHTML = `${emoji} <span>${emojiCounts[emoji]}</span>`;
        
        // Long press pour voir qui a réagi sans déclencher le clic normal
        let pressTimer;
        let isLongPress = false;
        
        badge.onpointerdown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                showReactionsModal(allReactionsList);
            }, 500);
        };
        badge.onpointerup = () => clearTimeout(pressTimer);
        badge.onpointerleave = () => clearTimeout(pressTimer);
        badge.onpointercancel = () => clearTimeout(pressTimer);
        
        badge.onclick = (e) => {
            if (isLongPress) {
                e.preventDefault();
                return;
            }
            toggleReaction(cellId, emoji, containerId);
        };

        badge.oncontextmenu = (e) => {
            e.preventDefault(); // Empêcher le menu natif sur mobile au long press
        };

        container.appendChild(badge);
    });

    const addBtnContainer = document.createElement('div');
    addBtnContainer.style.position = 'relative';

    const addBtn = document.createElement('div');
    addBtn.className = 'reaction-add-btn';
    addBtn.innerHTML = `
        <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
            <g transform="translate(0.000000,800.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                <path d="M6059 6686 c-56 -20 -104 -53 -133 -91 -47 -61 -56 -104 -56 -266 l0 -149 -147 0 c-168 0 -205 -8 -265 -53 -150 -115 -123 -340 52 -421 51 -24 65 -26 207 -26 l152 0 3 -162 c3 -182 10 -206 75 -274 105 -107 278 -96 370 24 45 60 53 97 53 265 l0 147 149 0 c161 0 207 10 268 56 41 31 83 101 95 160 20 95 -43 208 -144 258 -49 25 -60 26 -210 26 l-158 0 0 158 c0 144 -2 161 -24 208 -29 63 -95 120 -160 139 -60 18 -80 18 -127 1z"/>
                <path d="M3615 6434 c-521 -52 -948 -214 -1343 -508 -576 -430 -941 -1070 -1023 -1795 -15 -135 -6 -512 15 -644 90 -556 342 -1045 742 -1439 144 -142 219 -203 391 -318 814 -543 1869 -568 2710 -66 195 117 332 224 504 396 228 228 377 436 513 720 123 257 210 574 237 864 27 292 -9 659 -90 933 l-20 68 -106 -3 c-235 -8 -428 70 -586 236 -80 83 -119 142 -159 240 -25 62 -25 63 -100 95 -231 100 -389 286 -449 526 -26 104 -28 254 -5 356 26 116 34 104 -101 158 -194 78 -384 129 -600 163 -95 14 -445 27 -530 18z m-634 -1534 c116 -22 225 -103 274 -205 51 -103 50 -256 -2 -362 -36 -72 -125 -155 -200 -184 -78 -30 -225 -32 -295 -3 -165 68 -257 217 -245 395 9 141 81 256 197 318 89 48 170 60 271 41z m1811 -1 c208 -44 337 -243 299 -457 -23 -129 -100 -229 -218 -283 -150 -69 -335 -38 -448 76 -151 150 -150 411 1 562 91 90 233 130 366 102z m215 -1572 c31 -29 37 -41 40 -88 4 -48 1 -60 -32 -114 -202 -333 -536 -566 -936 -652 -116 -25 -427 -25 -549 0 -194 39 -420 137 -564 246 -144 108 -287 263 -370 399 -41 68 -48 133 -19 183 37 62 -34 59 1236 59 l1157 0 37 -33z"/>
            </g>
        </svg>
    `;
    addBtn.onclick = (e) => {
        e.stopPropagation();
        toggleEmojiMenu(cellId, containerId, addBtnContainer);
    };

    addBtnContainer.appendChild(addBtn);
    container.appendChild(addBtnContainer);
}

function toggleEmojiMenu(cellId, containerId, parentEl) {
    closeAllEmojiMenus();

    const menu = document.createElement('div');
    menu.className = 'emoji-picker-menu';
    menu.id = 'active-emoji-menu';
    
    const allEmojis = ['❤️', '😂', '😮', '👍', '👎', '🎉', '🔥', '👀', '💯', '✨', '😍', '😭', '😎', '🤔', '🙌', '👏', '🙏', '💪', '🥳', '🤯', '🤢', '🤡', '👽', '👻', '💩', '🍻', '🍷', '🥂', '🍕', '🍔', '🍟', '🍩', '🎂', '🐶', '🐱', '🐒', '🙈', '🙉', '🙊', '🚀', '⭐', '☀️', '🌈'];

    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
    gridContainer.style.gap = '8px';
    gridContainer.style.maxHeight = '200px';
    gridContainer.style.overflowY = 'auto';
    gridContainer.style.padding = '4px';

    allEmojis.forEach(emoji => {
        const opt = document.createElement('div');
        opt.className = 'emoji-option';
        opt.innerText = emoji;
        opt.style.textAlign = 'center';
        opt.onclick = (e) => {
            e.stopPropagation();
            closeAllEmojiMenus();
            toggleReaction(cellId, emoji, containerId);
        };
        gridContainer.appendChild(opt);
    });

    menu.appendChild(gridContainer);
    parentEl.appendChild(menu);

    // Ajustement si le menu dépasse l'écran à droite
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 10) {
        menu.style.left = 'auto';
        menu.style.right = '0';
    }

    document.addEventListener('click', closeAllEmojiMenus, { once: true });
}

function closeAllEmojiMenus() {
    const existingMenu = document.getElementById('active-emoji-menu');
    if (existingMenu) existingMenu.remove();
}

async function toggleReaction(cellId, emoji, containerId) {
    if (!currentUser) return;

    const { data: existing } = await supabaseClient
        .from('photo_reactions')
        .select('*')
        .eq('bingo_cell_id', cellId)
        .eq('reactor_id', currentUser.id)
        .maybeSingle();

    if (existing && existing.emoji === emoji) {
        await supabaseClient.from('photo_reactions').delete().eq('id', existing.id);
    } else if (existing) {
        await supabaseClient.from('photo_reactions').update({ emoji: emoji }).eq('id', existing.id);
    } else {
        await supabaseClient.from('photo_reactions').insert({
            bingo_cell_id: cellId,
            reactor_id: currentUser.id,
            reactor_email: currentUser.email,
            emoji: emoji
        });
    }

    loadReactions(cellId, containerId);
}

function showReactionsModal(reactionsList) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const modal = document.createElement('div');
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '12px';
    modal.style.padding = '20px';
    modal.style.width = '90%';
    modal.style.maxWidth = '320px';
    modal.style.maxHeight = '70vh';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    
    const title = document.createElement('h3');
    title.innerText = 'Réactions';
    title.style.marginTop = '0';
    title.style.marginBottom = '15px';
    title.style.textAlign = 'center';
    modal.appendChild(title);
    
    const listContainer = document.createElement('div');
    listContainer.style.overflowY = 'auto';
    listContainer.style.flexGrow = '1';
    listContainer.style.paddingRight = '5px';
    
    if (reactionsList.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#888; font-size:14px;">Aucune réaction</p>';
    } else {
        reactionsList.forEach(item => {
            const row = document.createElement('div');
            row.style.padding = '10px 0';
            row.style.borderBottom = '1px solid #f1f5f9';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.innerHTML = `<span style="font-weight: 500;">${item.name}</span> <span style="font-size:20px;">${item.emoji}</span>`;
            listContainer.appendChild(row);
        });
    }
    modal.appendChild(listContainer);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.innerText = 'Fermer';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.width = '100%';
    closeBtn.style.padding = '10px';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(closeBtn);
    
    overlay.appendChild(modal);
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
    
    document.body.appendChild(overlay);
}
