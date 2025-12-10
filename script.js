// ============================================================================
// 常數定義
// ============================================================================
const MAX_HISTORY_ITEMS = 10;  // 歷史記錄最大保存筆數
const MAX_WORKDAYS = 365;      // 自訂工作日天數上限

// ============================================================================
// 全域變數
// ============================================================================
let holidaySet = new Set();       // 存儲處理後的假日資料（格式：YYYY/MM/DD）
let holidaysLoaded = false;
let minDate = null;               // 假日資料的最小日期
let maxDate = null;               // 假日資料的最大日期
let calculationHistory = [];      // 計算歷史記錄

// 綁定按鈕事件
document.addEventListener('DOMContentLoaded', function() {
    // 處理假日資料
    processHolidays();

    // 載入歷史記錄
    loadHistory();

    // 初始化日期選擇器
    initDatePicker();

    // 綁定計算按鈕點擊事件
    document.getElementById('calcButton').addEventListener('click', calculateDate);

    // 綁定清除歷史記錄按鈕
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    // 讓輸入框按 Enter 也能計算
    document.getElementById('inputDate').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            calculateDate();
        }
    });

    // 日期選擇器輸入時的實時反饋
    document.getElementById('inputDate').addEventListener('input', function(e) {
        detectAndShowDateFormat(e.target.value);
    });

    // 天數選擇器事件
    initWorkDaysSelector();
});

// 處理假日資料
function processHolidays() {
    try {
        // 檢查 holidaysData 是否已經被定義
        if (typeof holidaysData === 'undefined') {
            throw new Error("假日資料未載入");
        }
        
        // 轉換假日資料為 YYYY/MM/DD 格式並只保留 isHoliday 為 true 的日期
        const holidayList = holidaysData
            .filter(holiday => holiday.isHoliday === true)
            .map(holiday => {
                const year = holiday.date.substring(0, 4);
                const month = holiday.date.substring(4, 6);
                const day = holiday.date.substring(6, 8);
                return `${year}/${month}/${day}`;
            });
        
        holidaySet = new Set(holidayList);

        // 找出假日資料的日期範圍
        // 注意：holidaysData 已按日期排序，直接取首尾即可
        if (holidaysData.length > 0) {
            const firstDateStr = holidaysData[0].date;
            const lastDateStr = holidaysData[holidaysData.length - 1].date;
            
            // 解析為日期物件
            const firstYear = firstDateStr.substring(0, 4);
            const firstMonth = firstDateStr.substring(4, 6);
            const firstDay = firstDateStr.substring(6, 8);
            minDate = new Date(`${firstYear}/${firstMonth}/${firstDay}`);
            
            const lastYear = lastDateStr.substring(0, 4);
            const lastMonth = lastDateStr.substring(4, 6);
            const lastDay = lastDateStr.substring(6, 8);
            maxDate = new Date(`${lastYear}/${lastMonth}/${lastDay}`);
            
            console.log(`假日資料範圍: ${formatDate(minDate)} 到 ${formatDate(maxDate)}`);
        }
        
        console.log("假日資料已載入 (Set):", holidaySet);
        document.getElementById('status').innerHTML = `<i class="fas fa-check-circle"></i> 已載入 ${holidaySet.size} 個假日`;
        document.getElementById('statusDot').classList.add('success');
        holidaysLoaded = true;
    } catch (error) {
        console.error("處理假日資料時出錯:", error);
        document.getElementById('status').innerHTML = `<i class="fas fa-exclamation-circle"></i> 無法載入假日資料`;
        document.getElementById('statusDot').classList.add('error');
        holidaysLoaded = false;
    }
}

/**
 * 計算並顯示從輸入日期起第九個工作日
 */
function calculateDate() {
    if (!holidaysLoaded) {
        alert("假日資料尚未載入完成，請重新整理頁面再試");
        return;
    }
    
    const inputDateStr = document.getElementById("inputDate").value;
    if (!inputDateStr) {
        alert("請輸入日期");
        return;
    }

    try {
        let year, month, day;
        
        // 檢查日期格式
        if (inputDateStr.includes('/')) {
            // 處理 YYYY/MM/DD 或 民國年/MM/DD 格式
            [year, month, day] = inputDateStr.split("/");
        } else if (inputDateStr.length === 8) {
            // 處理 YYYYMMDD 格式
            year = inputDateStr.substring(0, 4);
            month = inputDateStr.substring(4, 6);
            day = inputDateStr.substring(6, 8);
        } else if (inputDateStr.length === 7) {
            // 處理民國年格式 1140227
            year = parseInt(inputDateStr.substring(0, 3)) + 1911;
            month = inputDateStr.substring(3, 5);
            day = inputDateStr.substring(5, 7);
        } else {
            throw new Error("日期格式不正確，請使用 YYYY/MM/DD、YYYYMMDD、民國年/MM/DD 或 民國年月日7碼格式");
        }
        
        // 檢查日期格式是否正確
        if (!year || !month || !day) {
            throw new Error("日期格式不正確");
        }
        
        // 處理民國年轉西元年（只針對3碼民國年）
        if (year.toString().length <= 3) {
            year = parseInt(year) + 1911;
        }

        // 創建起始日期
        const startDate = new Date(`${year}/${month}/${day}`);
        if (isNaN(startDate.getTime())) {
            throw new Error("無效的日期格式");
        }
        
        // 檢查日期是否在假日資料範圍內
        if (maxDate && startDate > maxDate) {
            throw new Error(`輸入日期 ${formatDateForDisplay(startDate)} 超出假日資料範圍，最大可用日期為 ${formatDateForDisplay(maxDate)}`);
        }

        // 取得要計算的工作日天數
        const days = getDaysValue();
        if (!days || days < 1) {
            throw new Error("請輸入有效的工作日天數");
        }

        // 計算第 N 個工作日
        const resultDate = getWorkDay(startDate, days);

        // 檢查計算結果是否超出假日資料範圍
        if (maxDate && resultDate > maxDate) {
            throw new Error(`計算結果將超出假日資料範圍。請使用較早的起始日期，或更新假日資料。`);
        }

        // 顯示結果
        const resultElement = document.getElementById("result");

        // 將西元年轉回民國年顯示
        const rocYear = resultDate.getFullYear() - 1911;
        const resultMonth = resultDate.getMonth() + 1;
        const resultDay = resultDate.getDate();
        const resultDateStr = `${rocYear}/${resultMonth}/${resultDay}`;

        resultElement.innerHTML = `
            <div class="bg-gradient-to-br from-nature-light to-nature-cream organic-card p-6 sm:p-8 organic-shadow">
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-2 h-2 bg-nature-coral rounded-full"></div>
                    <h3 class="text-sm font-medium text-nature-green opacity-80">計算結果</h3>
                </div>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-white bg-opacity-60 rounded-2xl">
                        <span class="text-sm font-medium text-nature-moss">起始日期</span>
                        <span class="text-lg font-bold text-nature-green">${formatDateForDisplay(startDate)}</span>
                    </div>
                    <div class="flex items-center justify-center">
                        <i class="fas fa-arrow-down text-2xl text-nature-moss opacity-50"></i>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-nature-green bg-opacity-10 rounded-2xl border-2 border-nature-green border-opacity-20">
                        <span class="text-sm font-medium text-nature-green">第 ${days} 個工作日</span>
                        <span class="text-2xl font-light text-nature-green handwritten-number">${resultDateStr}</span>
                    </div>
                </div>
            </div>
        `;
        resultElement.classList.remove("hidden");

        // 保存到歷史記錄
        saveToHistory(formatDateForDisplay(startDate), resultDateStr, days);
        
    } catch (error) {
        alert("計算錯誤: " + error.message);
    }
}

/**
 * 計算從指定日期開始的第 n 個工作日
 * @param {Date} startDate 起始日期
 * @param {number} days 要計算的工作日數
 * @returns {Date} 第 n 個工作日的日期
 */
function getWorkDay(startDate, days) {
    let workDays = 0;
    const currentDate = new Date(startDate);
    
    // 從下一天開始計算
    currentDate.setDate(currentDate.getDate() + 1);
    
    while (workDays < days) {
        const dateString = formatDate(currentDate);
        
        // 檢查是否超出資料範圍
        if (maxDate && currentDate > maxDate) {
            throw new Error(`計算過程中超出假日資料範圍，無法確定 ${formatDateForDisplay(currentDate)} 是否為假日`);
        }
        
        // 檢查是否為假日 (使用 Set.has() 提升效能)
        if (!holidaySet.has(dateString)) {
            workDays++;
            console.log(`工作日 ${workDays}: ${dateString}`);
        } else {
            console.log(`假日: ${dateString}`);
        }
        
        if (workDays < days) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    return currentDate;
}

/**
 * 將日期物件格式化為 YYYY/MM/DD 字符串 (用於內部比較)
 * @param {Date} date 日期物件
 * @returns {string} 格式化的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * 將日期物件格式化為顯示用的日期字符串 (民國年)
 * @param {Date} date 日期物件
 * @returns {string} 格式化的日期字符串 (民國年/月/日)
 */
function formatDateForDisplay(date) {
    const rocYear = date.getFullYear() - 1911;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${rocYear}/${month}/${day}`;
}

/**
 * 將計算結果保存到歷史記錄
 * @param {string} startDate 起始日期
 * @param {string} resultDate 結果日期
 * @param {number} days 計算的工作日天數
 */
function saveToHistory(startDate, resultDate, days) {
    // 創建新的歷史記錄項
    const historyItem = {
        id: Date.now(), // 使用時間戳作為唯一ID
        startDate: startDate,
        resultDate: resultDate,
        days: days, // 計算的天數
        timestamp: new Date().toLocaleString() // 計算時間
    };
    
    // 添加到歷史記錄陣列
    calculationHistory.unshift(historyItem); // 新項目添加到數組開頭
    
    // 限制歷史記錄數量
    if (calculationHistory.length > MAX_HISTORY_ITEMS) {
        calculationHistory.pop(); // 刪除最舊的記錄
    }
    
    // 保存到 localStorage
    localStorage.setItem('workdayCalculatorHistory', JSON.stringify(calculationHistory));
    
    // 更新顯示
    renderHistory();
}

/**
 * 從 localStorage 載入歷史記錄
 */
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('workdayCalculatorHistory');
        if (!savedHistory) return;

        const parsed = JSON.parse(savedHistory);

        // 驗證資料格式
        if (!Array.isArray(parsed)) {
            throw new Error("歷史記錄格式錯誤");
        }

        // 過濾無效的記錄項目
        calculationHistory = parsed.filter(item =>
            item.id && item.startDate && item.resultDate && item.timestamp
        );

        renderHistory();
    } catch (error) {
        console.error("載入歷史記錄失敗:", error);
        localStorage.removeItem('workdayCalculatorHistory');
        calculationHistory = [];
    }
}

/**
 * 清除所有歷史記錄
 */
function clearHistory() {
    if (confirm('確定要清除所有歷史記錄嗎？此操作無法復原。')) {
        calculationHistory = [];
        localStorage.removeItem('workdayCalculatorHistory');
        renderHistory();
    }
}

/**
 * 渲染歷史記錄列表
 */
function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    // 如果沒有歷史記錄
    if (calculationHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history text-center py-8 text-nature-moss">
                <i class="fas fa-clock text-3xl mb-3 text-nature-sand"></i>
                <p>尚無計算記錄</p>
            </div>
        `;
        return;
    }

    // 有歷史記錄則顯示它們
    let historyHTML = '';
    calculationHistory.forEach(item => {
        // 向下相容：舊記錄沒有 days 欄位時預設為 9
        const days = item.days || 9;
        historyHTML += `
            <div class="bg-nature-light rounded-2xl p-4 hover:bg-nature-cream transition-colors duration-200" data-id="${item.id}">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-nature-moss flex items-center">
                            <i class="fas fa-clock mr-1"></i>
                            ${item.timestamp}
                        </span>
                        <div class="flex space-x-1">
                            <button
                                class="p-2 text-nature-green hover:text-white hover:bg-nature-green rounded-lg transition-colors duration-200"
                                onclick="useHistoryItem(${item.id})"
                                title="使用此日期"
                            >
                                <i class="fas fa-redo-alt text-sm"></i>
                            </button>
                            <button
                                class="p-2 text-nature-coral hover:text-white hover:bg-nature-coral rounded-lg transition-colors duration-200"
                                onclick="removeHistoryItem(${item.id})"
                                title="刪除此記錄"
                            >
                                <i class="fas fa-times text-sm"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-sm">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-nature-moss">起始日期</span>
                            <span class="font-semibold text-nature-green">${item.startDate}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-nature-moss">第 ${days} 個工作日</span>
                            <span class="font-semibold text-nature-green">${item.resultDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = historyHTML;
}

/**
 * 使用歷史記錄項重新填充輸入框
 * @param {number} id 歷史記錄項的ID
 */
function useHistoryItem(id) {
    const item = calculationHistory.find(item => item.id === id);
    if (item) {
        document.getElementById('inputDate').value = item.startDate;
    }
}

/**
 * 刪除特定歷史記錄項
 * @param {number} id 要刪除的歷史記錄項ID
 */
function removeHistoryItem(id) {
    calculationHistory = calculationHistory.filter(item => item.id !== id);
    localStorage.setItem('workdayCalculatorHistory', JSON.stringify(calculationHistory));
    renderHistory();
}

// ============================================================================
// 日期選擇器模組 (DatePicker Module)
// ============================================================================

/**
 * 初始化日期選擇器
 */
function initDatePicker() {
    const datePickerInput = document.getElementById('datePickerInput');
    const textInput = document.getElementById('inputDate');

    // 設定日期選擇器的預設值為今天
    const today = new Date();
    datePickerInput.valueAsDate = today;

    // 日期選擇器變更時更新文字輸入框
    datePickerInput.addEventListener('change', function() {
        if (this.value) {
            const date = new Date(this.value);
            const rocDate = convertToROCDate(date);
            textInput.value = rocDate;
            detectAndShowDateFormat(rocDate);
        }
    });

    // 快速日期按鈕事件綁定
    document.getElementById('btnToday').addEventListener('click', () => {
        setDateToday();
    });

    document.getElementById('btnYesterday').addEventListener('click', () => {
        setDateYesterday();
    });

    document.getElementById('btnNextMonday').addEventListener('click', () => {
        setDateNextMonday();
    });

    document.getElementById('btnClear').addEventListener('click', () => {
        clearDateInputs();
    });
}

/**
 * 設定日期為今天
 */
function setDateToday() {
    const today = new Date();
    syncDateInputs(today);
}

/**
 * 設定日期為昨天
 */
function setDateYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    syncDateInputs(yesterday);
}

/**
 * 設定日期為下週一
 */
function setDateNextMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 計算距離下週一的天數（0=週日, 1=週一...6=週六）
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    syncDateInputs(nextMonday);
}

/**
 * 清空所有日期輸入
 */
function clearDateInputs() {
    document.getElementById('datePickerInput').value = '';
    document.getElementById('inputDate').value = '';
    document.getElementById('formatHint').classList.add('hidden');
}

/**
 * 同步日期選擇器和文字輸入框
 * @param {Date} date 日期物件
 */
function syncDateInputs(date) {
    // 更新日期選擇器
    document.getElementById('datePickerInput').valueAsDate = date;

    // 更新文字輸入框（民國年格式）
    const rocDate = convertToROCDate(date);
    document.getElementById('inputDate').value = rocDate;

    // 顯示格式提示
    detectAndShowDateFormat(rocDate);
}

/**
 * 將西元日期物件轉換為民國年字串
 * @param {Date} date 日期物件
 * @returns {string} 民國年/月/日 格式
 */
function convertToROCDate(date) {
    const rocYear = date.getFullYear() - 1911;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${rocYear}/${month}/${day}`;
}

/**
 * 偵測並顯示輸入的日期格式
 * @param {string} input 使用者輸入的字串
 */
function detectAndShowDateFormat(input) {
    if (!input) {
        document.getElementById('formatHint').classList.add('hidden');
        return;
    }

    const hint = document.getElementById('formatHint');
    const hintText = document.getElementById('formatHintText');

    let detectedFormat = '';

    // 判斷日期格式
    if (input.includes('/')) {
        if (input.length === 8) { // M/D/YY 或 M/MM/DD
            const parts = input.split('/');
            if (parts[0].length <= 3) {
                detectedFormat = '✓ 民國年斜線格式 (114/2/27)';
            } else {
                detectedFormat = '✓ 西元年斜線格式 (2025/2/27)';
            }
        }
    } else if (input.length === 7) {
        detectedFormat = '✓ 民國年7碼 (1140227)';
    } else if (input.length === 8) {
        detectedFormat = '✓ 西元年8碼 (20250227)';
    } else {
        hint.classList.add('hidden');
        return;
    }

    if (detectedFormat) {
        hintText.textContent = detectedFormat;
        hint.classList.remove('hidden');
    }
}

// ============================================================================
// 天數選擇器模組 (WorkDays Selector Module)
// ============================================================================

/**
 * 初始化天數選擇器
 */
function initWorkDaysSelector() {
    const workDaysSelect = document.getElementById('workDays');
    const customDaysInput = document.getElementById('customDays');
    const calcButtonText = document.getElementById('calcButtonText');

    // 下拉選單變更事件
    workDaysSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            // 顯示自訂輸入框
            customDaysInput.classList.remove('hidden');
            customDaysInput.focus();
            customDaysInput.value = '';
        } else {
            // 隱藏自訂輸入框
            customDaysInput.classList.add('hidden');
            // 更新按鈕文字
            updateCalcButtonText(this.value);
        }
    });

    // 自訂輸入框變更事件
    customDaysInput.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value && value > 0) {
            updateCalcButtonText(value);
        }
    });

    // 自訂輸入框按 Enter 觸發計算
    customDaysInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            calculateDate();
        }
    });
}

/**
 * 更新計算按鈕文字
 * @param {number|string} days 天數
 */
function updateCalcButtonText(days) {
    const calcButtonText = document.getElementById('calcButtonText');
    calcButtonText.textContent = `計算第 ${days} 個工作日`;
}

/**
 * 取得使用者選擇的工作日天數
 * @returns {number} 天數
 */
function getDaysValue() {
    const workDaysSelect = document.getElementById('workDays');
    const customDaysInput = document.getElementById('customDays');

    if (workDaysSelect.value === 'custom') {
        const customValue = parseInt(customDaysInput.value);
        if (!customValue || customValue < 1) {
            throw new Error(`請輸入有效的自訂天數（1-${MAX_WORKDAYS}）`);
        }
        if (customValue > MAX_WORKDAYS) {
            throw new Error(`自訂天數不可超過 ${MAX_WORKDAYS} 天`);
        }
        return customValue;
    }

    return parseInt(workDaysSelect.value);
}
