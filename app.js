// --- CONFIGURATION --- 
const SUPABASE_PROJECT_ID = "VOTRE_PROJECT_ID_ICI";
const SUPABASE_KEY = "VOTRE_CLE_PUBLIABLE_ICI";
const supabaseClient = supabase.createClient(`https://${SUPABASE_PROJECT_ID}.supabase.co`, SUPABASE_KEY);

let currentUser = null;
let selectedIdx = null;
const bingoItems = [
    { title: "Un chien dans une voiture", emoji: "🐶🚗" },
    { title: "Un bol de soupe", emoji: "🥣" },
    { title: "Tes pieds dans les chaussures d'un autre Tapage", emoji: "👞" },
    { title: "Un Tapage pas encore couché au lever du soleil", emoji: "🥱" },
    { title: "Un selfie grimace avec un autre Tapage", emoji: "🥸" },
    { title: "Un berliner (le gateau)", emoji: "🍰" },
    { title: "Un personnage de Shrek dans la vraie vie", emoji: "🧌👹" },
    { title: "Un nom de rue qui fait penser aux Tapages", emoji: "🪧" },
    { title: "Une boîte d'Oeufs (ceux qui se mangent)", emoji: "🥚" },
    { title: "Un Tapage qui cherche quelque chose qu'iel a perdu", emoji: "👓" },
    { title: "Le sosie d'un Tapages", emoji: "👥" },
    { title: "Un selfie avec un animal", emoji: "👤🐒" },
    { title: "Ton magnifique vernis", emoji: "💅" },
    { title: "Un Tapage qui ne joue pas du bon instrument", emoji: "🎷🎺🖇️🥁" },
    { title: "Du munster (le fromage)", emoji: "🧀" },
    { title: "Deux Tapages sur un vélo", emoji: "🚴🚴" },
    { title: "Un batiment historique", emoji: "🏦" },
    { title: "Un Tapage en claquettes/tongs + chaussettes", emoji: "🩴🧦" },
    { title: "Une paréidolie", emoji: "😀" },
    { title: "Le sticker Tapages dans un lieu insolite", emoji: "🧐" },
    { title: "Claude la coccinelle", emoji: "🐞" },
    { title: "Un gant", emoji: "🧤" },
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
    const authInputs = document.querySelectorAll('#auth-section input');
    authInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const isLoginView = !document.getElementById('login-view').classList.contains('hidden');
                if (isLoginView) handleLogin();
                else handleSignup();
            }
        });
    });
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
async function handleLogin() {
    const pseudo = document.getElementById('login-email').value;
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
    const pseudo = document.getElementById('signup-email').value;
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
        showToast("Inscription réussie ! Tu peux maintenant te connecter.", "success");
        showLogin();
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
        .select('image_url, user_email')
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
        `;
        galleryContent.appendChild(item);
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
            cell.onclick = () => showUserPhoto(cellData.image_url, bingoItems[i].title);
        } else {
            cell.innerHTML = `<div class="cell-label">${bingoItems[i].emoji}</div>`;
        }

        gridDiv.appendChild(cell);
    }
}

function showUserPhoto(url, title) {
    const preview = document.getElementById('user-photo-preview');
    document.getElementById('user-photo-title').innerText = title;
    document.getElementById('user-photo-img').src = url;
    preview.classList.remove('hidden');
    preview.scrollIntoView({ behavior: 'smooth' });
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
window.showSignup = showSignup;
window.showLogin = showLogin;
window.uploadPhoto = uploadPhoto;
window.closeUpload = closeUpload;
window.switchTab = switchTab;
window.closeGallery = closeGallery;
window.showCellGallery = showCellGallery;
window.deletePhoto = deletePhoto;
window.closeUserGrid = closeUserGrid;
window.showUploadInput = showUploadInput;
window.showUserPhoto = showUserPhoto;
