import fetch from 'node-fetch';

async function fetchData() {
  try {
    const response = await fetch('http://localhost:3000/api/uni-farming/info?user_id=1');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchData();