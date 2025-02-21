import { useState, useEffect } from 'react';

export default function Test() {
    const [data, setData] = useState(null);

    const fetchAPI = async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/test`)
        const data = await response.json();
        setData(data);
    }

    useEffect(() => {
        fetchAPI();
    }, []);

    return (
      <div>
        <h2>Welcome to the Test Page?</h2>
        <p>{data ? JSON.stringify(data) : 'Loading...'}</p>
      </div>
    );
}