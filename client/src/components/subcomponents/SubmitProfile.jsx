import { useEffect, useState } from 'react';
import {
  Input,
  Button,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/ui.js';

import '@/styles/submitProfile.css';

export default function SubmitProfile() {
  const [input, setInput] = useState('u/');
  const [platform, setPlatform] = useState('Reddit');
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const inputFromRedirect = url.searchParams.get('input');

    if (inputFromRedirect) {
      setInput(inputFromRedirect);
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/reddit/session`, {
      credentials: 'include',
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reddit/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ platform, input, token }),
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
    const loginURL = `${import.meta.env.VITE_API_URL}/api/reddit/auth?redirect=${encodeURIComponent(
      redirect
    )}&input=${encodeURIComponent(input)}`;
    window.location.href = loginURL;
  };

  const renderSection = (title, items) => (
    <section className="profile-section">
      <div className="profile-section-box">
        <h3 className="profile-section-title">{title}</h3>
        {items && items.length ? (
          <ul className="profile-list">
            {items.map((item, idx) => (
              <li key={idx} className="profile-list-item">
                {item.title && <strong className="profile-item-title">{item.title}</strong>}
                {item.text && <p className="profile-item-text">{item.text}</p>}
                {item.upvotes !== undefined && <p>Upvotes: {item.upvotes}</p>}
                {item.comments !== undefined && <p>Comments: {item.comments}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="profile-empty-text">No data found.</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="submit-profile-container">
      <Card className="submit-profile-card">
        <CardHeader className="submit-profile-header">
          <CardTitle className="submit-profile-title">
            Submit a Social Media Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="submit-profile-content">
          <form onSubmit={handleSubmit} className="submit-profile-form">
            <div className="submit-profile-field">
              <Label htmlFor="platform" className="submit-profile-label">Platform</Label>
              <Select
                value={platform}
                onValueChange={(val) => {
                  setPlatform(val);
                  setInput(val === 'Reddit' ? 'u/' : '');
                }}
              >
                <SelectTrigger className="submit-profile-select">
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reddit">Reddit</SelectItem>
                  <SelectItem value="Bluesky" disabled>Bluesky (coming soon)</SelectItem>
                  <SelectItem value="X" disabled>X (coming soon)</SelectItem>
                  <SelectItem value="Facebook" disabled>Facebook (coming soon)</SelectItem>
                  <SelectItem value="Instagram" disabled>Instagram (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="submit-profile-field">
              <Label htmlFor="profile" className="submit-profile-label">Profile</Label>
              <Input
                id="profile"
                type="text"
                className="submit-profile-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., u/spez"
              />
            </div>

            {!token && platform === 'Reddit' && (
              <Button type="button" onClick={handleRedditSignIn} className="submit-profile-button">
                Sign in with Reddit
              </Button>
            )}

            <Button type="submit" disabled={!input} className="submit-profile-button">
              Submit Profile
            </Button>
          </form>

          {error && <p className="submit-profile-error">{error}</p>}

          {result && (
            <div className="profile-results">
              {renderSection('About', [result.about])}
              {renderSection('Posts', result.posts)}
              {renderSection('Comments', result.comments)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
