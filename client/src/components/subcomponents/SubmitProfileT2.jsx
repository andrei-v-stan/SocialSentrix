import { useEffect, useState } from 'react';

export default function SubmitProfile() {
  const [platform, setPlatform] = useState('Reddit');
  const [input, setInput] = useState('u/');
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [blueskyLoginVisible, setBlueskyLoginVisible] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState('');
  const [blueskyPassword, setBlueskyPassword] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const inputFromRedirect = url.searchParams.get('input');

    if (inputFromRedirect) {
      setInput(inputFromRedirect);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const route = platform.toLowerCase();
    fetch(`${import.meta.env.VITE_API_URL}/api/${route}/session`, {
      credentials: 'include'
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
        }
        if (inputFromRedirect && data.token) {
          submitProfile(inputFromRedirect, data.token);
        }
      });
  }, [platform]);

  const handlePlatformChange = (e) => {
    const selected = e.target.value;
    setPlatform(selected);
    setInput(selected === 'Reddit' ? 'u/' : selected === 'Bluesky' ? '@' : '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitProfile(input, token);
  };

  const submitProfile = async (submittedInput, authToken) => {
    setError('');
    const apiRoute = platform.toLowerCase();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/${apiRoute}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ platform, input: submittedInput, token: authToken })
    });

    const data = await response.json();

    if (
      data.about === undefined &&
      (!data.posts || !data.posts.length) &&
      (!data.comments || !data.comments.length)
    ) {
      setError('Profile not found or does not exist.');
      return;
    }

    setResult(data);
  };

  const handleRedditSignIn = () => {
    const redirect = window.location.pathname;
    const loginURL = `${import.meta.env.VITE_API_URL}/api/reddit/auth?redirect=${encodeURIComponent(redirect)}&input=${encodeURIComponent(input)}`;
    window.location.href = loginURL;
  };

  const handleBlueskyLogin = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bluesky/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ handle: blueskyHandle, appPassword: blueskyPassword })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token || '');
      setBlueskyLoginVisible(false);
      setBlueskyHandle('');
      setBlueskyPassword('');
      submitProfile(input, data.token);
    } else {
      setError(data.error || 'Bluesky login failed');
    }
  };

  const renderSection = (title, items) => (
    <section style={{ marginTop: '2rem' }}>
      <h3>{title}</h3>
      {items && items.length ? (
        <ul>
          {items.map((item, idx) => (
            <li key={idx}>
              {item.title && <strong>{item.title}</strong>}<br />
              {item.text && <p>{item.text}</p>}
              {item.upvotes !== undefined && <p>Upvotes: {item.upvotes}</p>}
              {item.reposts !== undefined && <p>Reposts: {item.reposts}</p>}
              {item.comments !== undefined && <p>Comments: {item.comments}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No data found.</p>
      )}
    </section>
  );

  return (
    <div>
      <h2>Submit a Social Media Profile</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Platform: </label>
          <select value={platform} onChange={handlePlatformChange}>
            <option value="Reddit">Reddit</option>
            <option value="Bluesky">Bluesky</option>
            <option value="X">X</option>
            <option value="Facebook">Facebook</option>
            <option value="Instagram">Instagram</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Profile Input: </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., u/spez or @user.bsky.social"
          />
        </div>

        {!token && platform === 'Reddit' && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" onClick={handleRedditSignIn}>
              Sign in with Reddit
            </button>
          </div>
        )}

        {!token && platform === 'Bluesky' && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" onClick={() => setBlueskyLoginVisible(!blueskyLoginVisible)}>
              {blueskyLoginVisible ? 'Cancel Bluesky Login' : 'Sign in with Bluesky'}
            </button>
          </div>
        )}

        {blueskyLoginVisible && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Bluesky Handle:</label><br />
            <input
              type="text"
              value={blueskyHandle}
              onChange={(e) => setBlueskyHandle(e.target.value)}
              placeholder="@user.bsky.social"
              style={{ width: '100%' }}
            /><br />
            <label>App Password:</label><br />
            <input
              type="password"
              value={blueskyPassword}
              onChange={(e) => setBlueskyPassword(e.target.value)}
              placeholder="App Password"
              style={{ width: '100%' }}
            /><br />
            <button type="button" onClick={handleBlueskyLogin}>Log In</button>
          </div>
        )}

        <button type="submit" disabled={!platform || !input}>
          Submit Profile
        </button>
      </form>

      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '2rem' }}>
          {renderSection('About', [result.about])}
          {renderSection('Posts', result.posts)}
          {renderSection('Comments', result.comments)}
          {result.likes ? renderSection('Liked Posts', result.likes) : (
            result.needsAuthForExtras ? (
              <div style={{ marginTop: '2rem' }}>
                <h3>Likes & Reposts</h3>
                <p>This data is private. Please sign in to view.</p>
                {!token && platform === 'Bluesky' && (
                  <button onClick={() => setBlueskyLoginVisible(true)}>Sign in with Bluesky</button>
                )}
              </div>
            ) : null
          )}
          {result.reposts && renderSection('Reposts', result.reposts)}
        </div>
      )}
    </div>
  );
}
