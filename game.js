// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получаем данные о пользователе
const userId = tg.initDataUnsafe?.user?.id || 'guest';
const userName = tg.initDataUnsafe?.user?.first_name || 'Гость';

// URL вашего бэкенда (замените на свой)
const API_URL = 'https://your-backend-url.com/api';

// Конфигурация игры
const BOARD_SIZE = 6;
const GEM_TYPES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const INITIAL_MOVES = 20;
const MATCH_SCORE = 10;
const COMBO_BONUS = 5;

// Элементы DOM
const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('best-score');
const movesDisplay = document.getElementById('moves');
const messageContainer = document.getElementById('message-container');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const showLeaderboardButton = document.getElementById('show-leaderboard');
const leaderboardContainer = document.getElementById('leaderboard-container');
const closeLeaderboardButton = document.getElementById('close-leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');

// Состояние игры
let board = [];
let score = 0;
let bestScore = 0;
let moves = INITIAL_MOVES;
let selectedGem = null;
let isProcessing = false;

// Инициализация игры
async function initGame() {
    // Загружаем рекорд пользователя
    await loadUserData();
    
    // Создаем доску
    createBoard();
    
    // Обрабатываем совпадения при начальной генерации
    let initialMatches = findAllMatches();
    while (initialMatches.length > 0) {
        // Перегенерируем доску, если есть совпадения
        createBoard();
        initialMatches = findAllMatches();
    }
    
    // Рендерим доску
    renderBoard();
    
    // Обновляем отображение
    updateDisplay();
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/user/${userId}`);
        if (response.ok) {
            const data = await response.json();
            bestScore = data.bestScore || 0;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // В случае ошибки, используем локальное хранилище
        bestScore = localStorage.getItem('bestScore') || 0;
    }
}

// Создание игровой доски
function createBoard() {
    board = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        const rowArray = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            // Избегаем начальных совпадений
            let validGems = [...GEM_TYPES];
            
            // Проверяем предыдущие два элемента по горизонтали
            if (col >= 2) {
                if (rowArray[col-1] === rowArray[col-2]) {
                    validGems = validGems.filter(gem => gem !== rowArray[col-1]);
                }
            }
            
            // Проверяем предыдущие два элемента по вертикали
            if (row >= 2) {
                if (board[row-1][col] === board[row-2][col]) {
                    validGems = validGems.filter(gem => gem !== board[row-1][col]);
                }
            }
            
            // Если нет допустимых гемов, выбираем случайный
            const gemType = validGems.length > 0 
                ? validGems[Math.floor(Math.random() * validGems.length)] 
                : GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                
            rowArray.push(gemType);
        }
        board.push(rowArray);
    }
}

// Рендеринг игровой доски
function renderBoard() {
    gameBoard.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const gemType = board[row][col];
            const gem = document.createElement('div');
            
            gem.className = `gem gem-${gemType}`;
            gem.dataset.row = row;
            gem.dataset.col = col;
            
            gem.addEventListener('click', () => handleGemClick(row, col));
            
            gameBoard.appendChild(gem);
        }
    }
}

// Обработка клика по гему
function handleGemClick(row, col) {
    if (isProcessing || moves <= 0) return;
    
    const clickedGem = document.querySelector(`.gem[data-row="${row}"][data-col="${col}"]`);
    
    // Если гем уже выбран, отменяем выбор
    if (selectedGem && selectedGem.dataset.row == row && selectedGem.dataset.col == col) {
        selectedGem.classList.remove('selected');
        selectedGem = null;
        return;
    }
    
    // Если это первый выбор
    if (!selectedGem) {
        selectedGem = clickedGem;
        selectedGem.classList.add('selected');
        return;
    }
    
    // Получаем координаты выбранного гема
    const selectedRow = parseInt(selectedGem.dataset.row);
    const selectedCol = parseInt(selectedGem.dataset.col);
    
    // Проверяем, соседние ли гемы
    const isAdjacent = (
        (Math.abs(selectedRow - row) === 1 && selectedCol === col) ||
        (Math.abs(selectedCol - col) === 1 && selectedRow === row)
    );
    
    if (!isAdjacent) {
        // Если гемы не соседние, делаем новый выбор
        selectedGem.classList.remove('selected');
        selectedGem = clickedGem;
        selectedGem.classList.add('selected');
        return;
    }
    
    // Меняем гемы местами
    swapGems(selectedRow, selectedCol, row, col);
}

// Обмен гемов местами
async function swapGems(row1, col1, row2, col2) {
    isProcessing = true;
    
    // Снимаем выделение
    if (selectedGem) {
        selectedGem.classList.remove('selected');
        selectedGem = null;
    }
    
    // Обмен в модели данных
    const temp = board[row1][col1];
    board[row1][col1] = board[row2][col2];
    board[row2][col2] = temp;
    
    // Визуально обновляем
    const gem1 = document.querySelector(`.gem[data-row="${row1}"][data-col="${col1}"]`);
    const gem2 = document.querySelector(`.gem[data-row="${row2}"][data-col="${col2}"]`);
    
    gem1.className = `gem gem-${board[row1][col1]}`;
    gem2.className = `gem gem-${board[row2][col2]}`;
    
    // Проверяем, есть ли совпадения после обмена
    let matches = findAllMatches();
    
    if (matches.length === 0) {
        // Если совпадений нет, возвращаем гемы обратно
        const tempBack = board[row1][col1];
        board[row1][col1] = board[row2][col2];
        board[row2][col2] = tempBack;
        
        gem1.className = `gem gem-${board[row1][col1]}`;
        gem2.className = `gem gem-${board[row2][col2]}`;
        
        isProcessing = false;
        return;
    }
    
    // Уменьшаем количество ходов
    moves--;
    
    // Обрабатываем совпадения
    await processMatches();
    
    // Обновляем отображение
    updateDisplay();
    
    // Проверяем, закончилась ли игра
    if (moves <= 0) {
        await endGame();
    }
    
    isProcessing = false;
}

// Поиск всех совпадений на доске
function findAllMatches() {
    const matches = [];
    
    // Поиск горизонтальных совпадений
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE - 2; col++) {
            if (
                board[row][col] !== null &&
                board[row][col] === board[row][col + 1] &&
                board[row][col] === board[row][col + 2]
            ) {
                // Находим полную длину совпадения
                let length = 3;
                while (col + length < BOARD_SIZE && board[row][col] === board[row][col + length]) {
                    length++;
                }
                
                // Добавляем все гемы в совпадении
                for (let i = 0; i < length; i++) {
                    matches.push({ row, col: col + i });
                }
                
                // Перескакиваем к концу текущего совпадения
                col += length - 1;
            }
        }
    }
    
    // Поиск вертикальных совпадений
    for (let col = 0; col < BOARD_SIZE; col++) {
        for (let row = 0; row < BOARD_SIZE - 2; row++) {
            if (
                board[row][col] !== null &&
                board[row][col] === board[row + 1][col] &&
                board[row][col] === board[row + 2][col]
            ) {
                // Находим полную длину совпадения
                let length = 3;
                while (row + length < BOARD_SIZE && board[row][col] === board[row + length][col]) {
                    length++;
                }
                
                // Добавляем все гемы в совпадении
                for (let i = 0; i < length; i++) {
                    matches.push({ row: row + i, col });
                }
                
                // Перескакиваем к концу текущего совпадения
                row += length - 1;
            }
        }
    }
    
    // Удаляем дубликаты (например, для L-образных совпадений)
    return matches.filter((match, index, self) =>
        index === self.findIndex(m => m.row === match.row && m.col === match.col)
    );
}

// Обработка совпадений
async function processMatches() {
    let hasMatches = true;
    let comboMultiplier = 1;
    
    while (hasMatches) {
        const matches = findAllMatches();
        
        if (matches.length === 0) {
            hasMatches = false;
            continue;
        }
        
        // Увеличиваем счет
        const matchScore = matches.length * MATCH_SCORE * comboMultiplier;
        score += matchScore;
        
        // Анимация и удаление совпавших гемов
        matches.forEach(match => {
            const gem = document.querySelector(`.gem[data-row="${match.row}"][data-col="${match.col}"]`);
            gem.classList.add('matched');
            // Маркируем удаленные гемы как null
            board[match.row][match.col] = null;
        });
        
        // Ждем завершения анимации
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Обновляем доску после удаления гемов
        await cascadeGems();
        
        // Заполняем пустые места новыми гемами
        await fillEmptySpaces();
        
        // Увеличиваем комбо-множитель
        comboMultiplier += COMBO_BONUS / 100;
    }
    
    // Обновляем рекорд
    if (score > bestScore) {
        bestScore = score;
    }
}

// Падение гемов вниз после удаления совпадений
async function cascadeGems() {
    for (let col = 0; col < BOARD_SIZE; col++) {
        let emptyRow = -1;
        
        // Проходим снизу вверх
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (board[row][col] === null) {
                // Запоминаем первую пустую ячейку
                if (emptyRow === -1) {
                    emptyRow = row;
                }
            } else if (emptyRow !== -1) {
                // Перемещаем гем вниз
                board[emptyRow][col] = board[row][col];
                board[row][col] = null;
                
                // Анимируем падение
                const gem = document.querySelector(`.gem[data-row="${row}"][data-col="${col}"]`);
                gem.classList.add('falling');
                gem.style.transform = `translateY(${(emptyRow - row) * (100 / BOARD_SIZE)}%)`;
                
                // Обновляем атрибуты и классы
                gem.dataset.row = emptyRow;
                
                // Ищем следующую пустую ячейку
                emptyRow--;
            }
        }
    }
    
    // Ждем завершения анимации падения
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Перерисовываем доску для корректного отображения
    renderBoard();
}

// Заполнение пустых мест новыми гемами
async function fillEmptySpaces() {
    for (let col = 0; col < BOARD_SIZE; col++) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (board[row][col] === null) {
                // Создаем новый гем
                const gemType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
                board[row][col] = gemType;
            }
        }
    }
    
    // Перерисовываем доску
    renderBoard();
}

// Обновление отображения счета и ходов
function updateDisplay() {
    scoreDisplay.textContent = score;
    bestScoreDisplay.textContent = bestScore;
    movesDisplay.textContent = moves;
}

// Завершение игры
async function endGame() {
    // Сохраняем результат
    await saveScore();
    
    // Показываем сообщение о конце игры
    finalScoreDisplay.textContent = score;
    messageContainer.classList.remove('hidden');
}

// Сохранение результата
async function saveScore() {
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        
        try {
            await fetch(`${API_URL}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    userName,
                    score
                })
            });
        } catch (error) {
            console.error('Error saving score:', error);
        }
    }
}

// Загрузка таблицы рекордов
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (response.ok) {
            const leaderboard = await response.json();
            
            // Очищаем таблицу
            leaderboardBody.innerHTML = '';
            
            // Заполняем данными
            leaderboard.forEach((entry, index) => {
                const row = document.createElement('tr');
                
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = entry.userName;
                
                const scoreCell = document.createElement('td');
                scoreCell.textContent = entry.score;
                
                row.appendChild(rankCell);
                row.appendChild(nameCell);
                row.appendChild(scoreCell);
                
                leaderboardBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        leaderboardBody.innerHTML = '<tr><td colspan="3">Не удалось загрузить данные</td></tr>';
    }
}

// Перезапуск игры
function restartGame() {
    score = 0;
    moves = INITIAL_MOVES;
    selectedGem = null;
    
    createBoard();
    renderBoard();
    updateDisplay();
    
    messageContainer.classList.add('hidden');
}

// Обработчики событий
restartButton.addEventListener('click', restartGame);

showLeaderboardButton.addEventListener('click', () => {
    loadLeaderboard();
    leaderboardContainer.classList.remove('hidden');
});

closeLeaderboardButton.addEventListener('click', () => {
    leaderboardContainer.classList.add('hidden');
});

// Инициализация игры при загрузке страницы
window.addEventListener('load', initGame);

// Уведомление Telegram о готовности приложения
tg.MainButton.setText('Играть снова');
tg.MainButton.onClick(() => {
    if (moves <= 0) {
        restartGame();
    }
});

// Добавьте этот код в конец файла game.js
document.addEventListener('click', function(event) {
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (!leaderboardContainer.classList.contains('hidden')) {
        leaderboardContainer.classList.add('hidden');
    }
});
