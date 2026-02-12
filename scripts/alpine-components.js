// ============================================
// Firebase Configuration
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, updateDoc, addDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import Alpine from 'https://unpkg.com/alpinejs@3.x.x/dist/module.esm.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Alpine.js component registration
const gameLibraryComponent = () => ({
    user: null,
    games: [],
    filteredGames: [],
    loading: false,
    error: null,
    noAccess: false,
    searchQuery: '',
    filter: 'all',
    sortBy: 'name',
    firebaseReady: false,
    showFilters: false,
    filters: {
        players: '',
        maxTime: '',
        minAge: '',
        maxComplexity: '',
        isParty: false,
        isCoop: false
    },
    toast: {
        show: false,
        message: '',
        type: 'success'
    },
    canEdit: true,
    showAddGameModal: false,
    ludopediaUrl: '',
    fetchingGame: false,
    addingGame: false,
    addGameError: null,
    newGame: {
        name: '',
        playersMin: '',
        playersMax: '',
        age: '',
        time: '',
        complexity: '',
        coop: 'Não',
        party: 'Não',
        rating: '',
        rank: '',
        link: '',
        image: ''
    },

    init() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.firebaseReady = true;
            if (user) {
                this.user = {
                    name: user.displayName,
                    email: user.email,
                    picture: user.photoURL
                };
                this.loadGames();
            } else {
                this.user = null;
                this.games = [];
                this.filteredGames = [];
            }
        });
    },

    async signIn() {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Sign-in error:', error);
            this.showToast('Erro ao fazer login', 'error');
        }
    },

    async signOut() {
        try {
            await firebaseSignOut(auth);
            this.user = null;
            this.games = [];
            this.filteredGames = [];
            this.noAccess = false;
            this.error = null;
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    },

    async loadGames() {
        this.loading = true;
        this.error = null;
        this.noAccess = false;

        try {
            const gamesRef = collection(db, 'boardgames');
            const q = query(gamesRef, orderBy('name'));
            const snapshot = await getDocs(q);

            this.games = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                this.games.push({
                    id: doc.id,
                    name: data.name || '',
                    playersMin: data.playersMin || '',
                    playersMax: data.playersMax || '',
                    age: data.age || '',
                    time: data.time || '',
                    complexity: data.complexity || '',
                    coop: data.coop || 'Não',
                    party: data.party || 'Não',
                    rating: data.rating || '',
                    rank: data.rank || '',
                    link: data.link || '',
                    image: data.image || '',
                    borrowedBy: data.borrowedBy || null,
                    borrowedByName: data.borrowedByName || null,
                    processing: false
                });
            });

            this.filterGames();
        } catch (error) {
            console.error('Error loading games:', error);
            if (error.code === 'permission-denied') {
                this.noAccess = true;
            } else {
                this.error = error.message || 'Erro desconhecido ao carregar jogos';
            }
        } finally {
            this.loading = false;
        }
    },

    filterGames() {
        let filtered = [...this.games];

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(game =>
                game.name.toLowerCase().includes(query)
            );
        }

        // Apply category filter
        switch (this.filter) {
            case 'available':
                filtered = filtered.filter(game => !game.borrowedBy);
                break;
            case 'mine':
                filtered = filtered.filter(game => game.borrowedBy === this.user?.email);
                break;
            case 'borrowed':
                filtered = filtered.filter(game => game.borrowedBy && game.borrowedBy !== this.user?.email);
                break;
        }

        // Apply players filter
        if (this.filters.players) {
            const numPlayers = parseInt(this.filters.players);
            filtered = filtered.filter(game => {
                const min = parseInt(game.playersMin) || 0;
                const max = parseInt(game.playersMax) || 99;
                return numPlayers >= min && numPlayers <= max;
            });
        }

        // Apply time filter
        if (this.filters.maxTime) {
            const maxTime = parseInt(this.filters.maxTime);
            filtered = filtered.filter(game => {
                const gameTime = parseInt(game.time) || 0;
                return gameTime <= maxTime;
            });
        }

        // Apply age filter
        if (this.filters.minAge) {
            const userAge = parseInt(this.filters.minAge);
            filtered = filtered.filter(game => {
                const gameAge = parseInt(game.age) || 0;
                return gameAge >= userAge;
            });
        }

        // Apply complexity filter
        if (this.filters.maxComplexity) {
            const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const filterValue = normalize(this.filters.maxComplexity);
            filtered = filtered.filter(game => {
                const gameComplexity = normalize(game.complexity || '');
                return gameComplexity === filterValue;
            });
        }

        // Apply party filter
        if (this.filters.isParty) {
            filtered = filtered.filter(game =>
                game.party && game.party.toLowerCase() !== 'não' && game.party.toLowerCase() !== 'no'
            );
        }

        // Apply coop filter
        if (this.filters.isCoop) {
            filtered = filtered.filter(game =>
                game.coop && game.coop.toLowerCase() !== 'não' && game.coop.toLowerCase() !== 'no'
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'rating':
                    const ratingA = parseFloat(a.rating) || 0;
                    const ratingB = parseFloat(b.rating) || 0;
                    return ratingB - ratingA;
                case 'rank':
                    const rankA = parseInt(a.rank) || 99999;
                    const rankB = parseInt(b.rank) || 99999;
                    return rankA - rankB;
                case 'players':
                    const playersA = parseInt(a.playersMax) || 0;
                    const playersB = parseInt(b.playersMax) || 0;
                    return playersB - playersA;
                case 'time':
                    const timeA = parseInt(a.time) || 0;
                    const timeB = parseInt(b.time) || 0;
                    return timeA - timeB;
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        this.filteredGames = filtered;
    },

    clearFilters() {
        this.filters = {
            players: '',
            maxTime: '',
            minAge: '',
            maxComplexity: '',
            isParty: false,
            isCoop: false
        };
        this.filterGames();
    },

    get hasActiveFilters() {
        return this.filters.players || this.filters.maxTime || this.filters.minAge ||
               this.filters.maxComplexity || this.filters.isParty || this.filters.isCoop;
    },

    setFilter(newFilter) {
        this.filter = newFilter;
        this.filterGames();
    },

    async borrowGame(game) {
        if (game.processing) return;
        game.processing = true;

        try {
            const gameRef = doc(db, 'boardgames', game.id);
            await updateDoc(gameRef, {
                borrowedBy: this.user.email,
                borrowedByName: this.user.name
            });

            game.borrowedBy = this.user.email;
            game.borrowedByName = this.user.name;
            this.filterGames();
            this.showToast(`"${game.name}" emprestado com sucesso!`, 'success');
        } catch (error) {
            console.error('Error borrowing game:', error);
            this.showToast('Erro ao emprestar jogo', 'error');
        } finally {
            game.processing = false;
        }
    },

    async returnGame(game) {
        if (game.processing) return;
        game.processing = true;

        try {
            const gameRef = doc(db, 'boardgames', game.id);
            await updateDoc(gameRef, {
                borrowedBy: null,
                borrowedByName: null
            });

            game.borrowedBy = null;
            game.borrowedByName = null;
            this.filterGames();
            this.showToast(`"${game.name}" devolvido com sucesso!`, 'success');
        } catch (error) {
            console.error('Error returning game:', error);
            this.showToast('Erro ao devolver jogo', 'error');
        } finally {
            game.processing = false;
        }
    },

    showToast(message, type = 'success') {
        this.toast = { show: true, message, type };
        setTimeout(() => {
            this.toast.show = false;
        }, 3000);
    },

    resetNewGame() {
        this.newGame = {
            name: '',
            playersMin: '',
            playersMax: '',
            age: '',
            time: '',
            complexity: '',
            coop: 'Não',
            party: 'Não',
            rating: '',
            rank: '',
            link: '',
            image: ''
        };
        this.addGameError = null;
    },

    closeAddGameModal() {
        this.showAddGameModal = false;
        this.ludopediaUrl = '';
        this.resetNewGame();
    },

    async fetchLudopediaGame() {
        if (!this.ludopediaUrl) return;

        if (!this.ludopediaUrl.includes('ludopedia.com.br/jogo/')) {
            this.addGameError = 'URL inválida. Use um link da Ludopedia (ex: ludopedia.com.br/jogo/nome-do-jogo)';
            return;
        }

        this.fetchingGame = true;
        this.addGameError = null;
        this.resetNewGame();

        try {
            const proxies = [
                (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
                (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
            ];

            let html = null;
            let lastError = null;

            for (const proxyFn of proxies) {
                try {
                    const proxyUrl = proxyFn(this.ludopediaUrl);
                    const response = await fetch(proxyUrl);
                    if (response.ok) {
                        html = await response.text();
                        break;
                    }
                } catch (e) {
                    lastError = e;
                }
            }

            if (!html) {
                throw lastError || new Error('Não foi possível acessar a página');
            }

            this.parseLudopediaHtml(html);

            if (!this.newGame.name) {
                throw new Error('Não foi possível extrair as informações do jogo');
            }
        } catch (error) {
            console.error('Error fetching Ludopedia:', error);
            this.addGameError = error.message || 'Erro ao buscar jogo da Ludopedia';
        } finally {
            this.fetchingGame = false;
        }
    },

    parseLudopediaHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Game name
        const nameSelectors = [
            'h3 a[href*="/jogo/"]',
            'h1',
            'h2',
            '.jogo-title',
            '[itemprop="name"]',
            'title'
        ];
        for (const selector of nameSelectors) {
            const el = doc.querySelector(selector);
            if (el) {
                let name = el.textContent.trim();
                if (selector === 'title') {
                    name = name.replace(/\s*[-|].*$/, '').trim();
                }
                if (name && name.length > 0 && name.length < 200) {
                    this.newGame.name = name;
                    break;
                }
            }
        }

        // Image
        const imgMatch = html.match(/https:\/\/storage\.googleapis\.com\/ludopedia-capas\/\d+_[mt]\.jpg/);
        if (imgMatch) {
            this.newGame.image = imgMatch[0].replace(/_t\.jpg$/, '_m.jpg');
        } else {
            const imgEl = doc.querySelector('img[src*="ludopedia"], .img-jogo img, .capa-jogo img');
            if (imgEl) {
                this.newGame.image = imgEl.src || imgEl.getAttribute('data-src') || '';
            }
        }

        const infoText = doc.body.textContent;

        // Players
        const playersMatch = infoText.match(/(\d+)\s*(?:a|-)\s*(\d+)\s*jogador/i) ||
                             infoText.match(/(\d+)\s*jogador/i);
        if (playersMatch) {
            this.newGame.playersMin = playersMatch[1];
            this.newGame.playersMax = playersMatch[2] || playersMatch[1];
        }

        // Age
        const ageMatch = infoText.match(/(?:idade|anos?)[:\s]*(\d+)/i) ||
                        infoText.match(/(\d+)\s*(?:\+|anos)/i);
        if (ageMatch) {
            this.newGame.age = ageMatch[1];
        }

        // Time
        const timeMatch = infoText.match(/(\d+)(?:\s*-\s*\d+)?\s*min/i);
        if (timeMatch) {
            this.newGame.time = timeMatch[1];
        }

        // Rating
        const ratingMatch = infoText.match(/nota\s*(?:m[eé]dia)?[:\s]*(\d+[.,]\d+)/i);
        if (ratingMatch) {
            this.newGame.rating = ratingMatch[1].replace(',', '.');
        }

        // Rank
        const rankMatch = infoText.match(/rank\s*(?:bg)?[:\s]*(\d+)/i);
        if (rankMatch) {
            this.newGame.rank = rankMatch[1];
        }

        // Party
        if (/jogo\s*festivo|party/i.test(infoText)) {
            this.newGame.party = 'Sim';
        }

        // Cooperative
        if (/cooperativo|coop/i.test(infoText)) {
            this.newGame.coop = 'Sim';
        }

        this.newGame.link = this.ludopediaUrl;
    },

    async addGameToSheet() {
        if (!this.newGame.name) return;

        this.addingGame = true;
        this.addGameError = null;

        try {
            const gamesRef = collection(db, 'boardgames');
            await addDoc(gamesRef, {
                name: this.newGame.name,
                playersMin: this.newGame.playersMin,
                playersMax: this.newGame.playersMax,
                age: this.newGame.age,
                time: this.newGame.time,
                complexity: this.newGame.complexity,
                coop: this.newGame.coop,
                party: this.newGame.party,
                rating: this.newGame.rating,
                rank: this.newGame.rank,
                link: this.newGame.link,
                image: this.newGame.image,
                borrowedBy: null,
                borrowedByName: null,
                createdAt: new Date()
            });

            this.showToast(`"${this.newGame.name}" adicionado com sucesso!`, 'success');
            this.closeAddGameModal();
            this.loadGames();
        } catch (error) {
            console.error('Error adding game:', error);
            this.addGameError = 'Erro ao adicionar jogo.';
        } finally {
            this.addingGame = false;
        }
    }
});

// Register component with Alpine and start when DOM is ready
window.Alpine = Alpine;
Alpine.data('gameLibrary', gameLibraryComponent);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Alpine.start());
} else {
    Alpine.start();
}
