import React, { useState, useEffect } from 'react';

import getData from './Scripts/getData';


function App() {
  const [data, setData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const newData = await getData([-72.8307,41.8098], '2021-03-16', [1000, 1100], 43);
      setData(newData);
    };

    fetchData();
  }, []);

  return (
    <pre>{JSON.stringify(data, null, 2)}</pre>
  );
}

export default App;
