
document.addEventListener('DOMContentLoaded', function() {
    const mealDateInput = document.getElementById('mealDate');
    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const mealInfo = document.getElementById('mealInfo');
    const errorMessage = document.getElementById('errorMessage');
    const mealDateDisplay = document.getElementById('mealDate-display');
    const mealContent = document.getElementById('mealContent');

    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    mealDateInput.value = todayString;

    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', searchMealInfo);
    
    // 엔터 키 이벤트
    mealDateInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMealInfo();
        }
    });

    async function searchMealInfo() {
        const selectedDate = mealDateInput.value;
        
        if (!selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }

        // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
        const formattedDate = selectedDate.replace(/-/g, '');
        
        // UI 상태 변경
        hideAllMessages();
        loading.classList.remove('hidden');

        try {
            const response = await fetchMealData(formattedDate);
            displayMealInfo(response, selectedDate);
        } catch (error) {
            console.error('급식 정보 조회 실패:', error);
            showError();
        } finally {
            loading.classList.add('hidden');
        }
    }

    async function fetchMealData(date) {
        const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530079&MLSV_YMD=${date}`;
        
        // CORS 문제 해결을 위해 프록시 서버 사용
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error('네트워크 오류');
        }
        
        const xmlText = await response.text();
        return parseXMLResponse(xmlText);
    }

    function parseXMLResponse(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // XML 파싱 오류 확인
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML 파싱 오류');
        }

        // 급식 정보 추출
        const mealRows = xmlDoc.querySelectorAll('row');
        
        if (mealRows.length === 0) {
            throw new Error('급식 정보 없음');
        }

        const meals = [];
        mealRows.forEach(row => {
            const mealTime = getTextContent(row, 'MMEAL_SC_NM');
            const dishName = getTextContent(row, 'DDISH_NM');
            const calories = getTextContent(row, 'CAL_INFO');
            const nutrition = getTextContent(row, 'NTR_INFO');

            meals.push({
                time: mealTime,
                dishes: dishName,
                calories: calories,
                nutrition: nutrition
            });
        });

        return meals;
    }

    function getTextContent(element, tagName) {
        const tag = element.querySelector(tagName);
        return tag ? tag.textContent.trim() : '';
    }

    function displayMealInfo(meals, date) {
        if (meals.length === 0) {
            showError();
            return;
        }

        // 날짜 표시 형식 변경
        const dateObj = new Date(date);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        const koreanDate = dateObj.toLocaleDateString('ko-KR', options);
        
        mealDateDisplay.textContent = koreanDate + ' 급식 정보';
        
        // 급식 정보 표시
        mealContent.innerHTML = '';
        
        meals.forEach(meal => {
            const mealDiv = document.createElement('div');
            mealDiv.className = 'meal-time';
            
            const mealTimeTitle = document.createElement('h3');
            mealTimeTitle.textContent = meal.time || '급식';
            
            const mealMenu = document.createElement('div');
            mealMenu.className = 'meal-menu';
            
            // 메뉴 항목들을 줄바꿈으로 분리하여 표시
            if (meal.dishes) {
                const dishes = meal.dishes.split('<br/>').filter(dish => dish.trim());
                dishes.forEach(dish => {
                    const dishDiv = document.createElement('div');
                    dishDiv.textContent = dish.trim();
                    mealMenu.appendChild(dishDiv);
                });
            }
            
            // 칼로리 정보 추가
            if (meal.calories) {
                const calorieDiv = document.createElement('div');
                calorieDiv.textContent = `📊 ${meal.calories}`;
                calorieDiv.style.color = '#28a745';
                calorieDiv.style.fontWeight = 'bold';
                calorieDiv.style.marginTop = '10px';
                mealMenu.appendChild(calorieDiv);
            }
            
            mealDiv.appendChild(mealTimeTitle);
            mealDiv.appendChild(mealMenu);
            mealContent.appendChild(mealDiv);
        });
        
        mealInfo.classList.remove('hidden');
    }

    function showError() {
        errorMessage.classList.remove('hidden');
    }

    function hideAllMessages() {
        loading.classList.add('hidden');
        mealInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
    }
});
