// BACKUP: Removed guest API code from Friends.tsx
// Date: July 6, 2025
// Reason: API endpoint /api/users/guest/ doesn't exist on backend
// This code was causing 404 errors and useState errors

// State for direct link data
const [directLinkData, setDirectLinkData] = useState({
  isLoading: false,
  refCode: '',
  error: ''
});

// Function to fetch referral code directly
const fetchDirectRefCode = async () => {
  setDirectLinkData({ isLoading: true, refCode: '', error: '' });
  
  try {
    // Get guest_id from localStorage
    let guestId;
    try {
      guestId = localStorage.getItem('unifarm_guest_id');
    } catch (storageError) {
      console.error('Ошибка при доступе к localStorage:', storageError);
      setDirectLinkData({ 
        isLoading: false, 
        refCode: '', 
        error: 'Не удалось получить данные из локального хранилища' 
      });
      return;
    }
    
    if (!guestId) {
      console.warn('guest_id отсутствует в localStorage');
      setDirectLinkData({ 
        isLoading: false, 
        refCode: '', 
        error: 'Не удалось получить идентификатор гостя' 
      });
      return;
    }
    
    // Make API request
    let data;
    try {
      data = await correctApiRequest(`/api/users/guest/${guestId}`, 'GET');
    } catch (apiError: any) {
      console.error('Ошибка при запросе данных пользователя:', apiError);
      setDirectLinkData({ 
        isLoading: false, 
        refCode: '', 
        error: apiError.message || 'Не удалось подключиться к серверу' 
      });
      return;
    }
    
    if (data.success && data.data && data.data.ref_code) {
      setDirectLinkData({ 
        isLoading: false, 
        refCode: data.data.ref_code, 
        error: '' 
      });
    } else if (data.success && data.data && !data.data.ref_code) {
      // Try to generate ref_code
      try {
        const genData = await correctApiRequest('/api/users/generate-refcode', 'POST', { 
          user_id: data.data.id 
        });
        
        if (genData.success && genData.data && genData.data.ref_code) {
          setDirectLinkData({ 
            isLoading: false, 
            refCode: genData.data.ref_code, 
            error: '' 
          });
        } else {
          console.warn('Не удалось сгенерировать реферальный код:', genData);
          setDirectLinkData({ 
            isLoading: false, 
            refCode: '', 
            error: genData.message || 'Не удалось сгенерировать реферальный код' 
          });
        }
      } catch (genError: any) {
        console.error('Ошибка при генерации реферального кода:', genError);
        setDirectLinkData({ 
          isLoading: false, 
          refCode: '', 
          error: genError.message || 'Ошибка при генерации кода' 
        });
      }
    } else {
      console.warn('Неуспешный ответ при получении пользователя:', data);
      setDirectLinkData({ 
        isLoading: false, 
        refCode: '', 
        error: data.message || 'Не удалось получить данные пользователя' 
      });
    }
  } catch (error) {
    console.error('Необработанная ошибка в fetchDirectRefCode:', error);
    setDirectLinkData({ 
      isLoading: false, 
      refCode: '', 
      error: (error as Error).message || 'Произошла ошибка при запросе данных' 
    });
  }
};

// useEffect to load data on first render
useEffect(() => {
  try {
    fetchDirectRefCode();
  } catch (error) {
    console.error('Необработанная ошибка при первоначальной загрузке данных:', error);
    // Silent error handling
  }
}, []);