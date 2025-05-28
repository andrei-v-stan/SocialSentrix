import { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import Cookies from 'js-cookie';
import { Input, Button, Label, Card, CardHeader, CardTitle, CardContent, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/ui.js';
import '@/styles/submitProfile.css';

export default function SubmitProfile({ onResult }) {
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blueskyUsername, setBlueskyUsername] = useState('');
  const [blueskyPassword, setBlueskyPassword] = useState('');

  const inputRef = useRef();

  const platformPlaceholders = {
    Reddit: 'username | u/username | <username link>',
    Bluesky: '@example.bsky.social'
  };

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError('');
    setShowDropdown(false);
    setIsSubmitting(true);

    const profiles = input
      .split('&')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await Promise.all(profiles.map(async (profileInput) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/submit-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platform, input: profileInput, token }),
        });

        const data = await response.json();

        if (data.error || !data.posts || !data.comments) {
          setError((prev) => `${prev}\n❌ "${profileInput}" not found or invalid.`);
        } else {
          if (data.tokenInvalid === true) {
            alert(`Your token for ${data.username} is invalid. Please sign in again.`);
          }

          onResult?.({
  title: `${data.platform}: ${data.username}`,
  content: {
    posts: data.posts,
    comments: data.comments,
    upvotes: data.upvotes || data.likes || [],
    downvotes: data.downvotes || [],
  },
});

        }
      }));
    } catch (err) {
      console.error('Submit profile error:', err);
      setError('Something went wrong while submitting one or more profiles.');
    } finally {
      setIsSubmitting(false);
      setInput('');
    }
  }, [platform, input, token, onResult]);


  useEffect(() => {
    const url = new URL(window.location.href);
    const inputFromRedirect = url.searchParams.get('input');

    if (inputFromRedirect) {
      setInput(inputFromRedirect);
      window.history.replaceState({}, '', window.location.pathname);

      fetch(`${import.meta.env.VITE_API_URL}/api/${platform.toLowerCase()}/session`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
            handleSubmit();
          }
        });
    }
  }, [platform, handleSubmit]);

  const handleSignIn = () => {
    const redirect = window.location.pathname;
    const loginURL = `${import.meta.env.VITE_API_URL}/api/${platform.toLowerCase()}/auth?redirect=${encodeURIComponent(
      redirect
    )}&input=${encodeURIComponent(input)}`;
    window.location.href = loginURL;
  };

  const handleBlueskyLogin = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bluesky/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: blueskyUsername, password: blueskyPassword })
      });
      const data = await res.json();

      if (data.success) {
        alert(`Logged in as ${data.handle}`);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not login to Bluesky.');
    }
  };

  const handleInputFocus = async () => {
    const userID = Cookies.get('userID');
    if (!userID || !platform) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/mongodb/get-user-profiles?platform=${encodeURIComponent(platform)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      const owned = (data.ownedProfiles || []).map(u => ({ name: u, owned: true }));
      const associated = (data.associatedProfiles || [])
        .filter(u => !owned.some(o => o.name === u))
        .map(u => ({ name: u, owned: false }));
      const sortedOwned = owned.sort((a, b) => a.name.localeCompare(b.name));
      const sortedAssociated = associated.sort((a, b) => a.name.localeCompare(b.name));
      const combined = [...sortedOwned, ...sortedAssociated];
      const filtered = combined.filter((s) => s.name.toLowerCase().includes(input.toLowerCase()));
      setSuggestions(combined);
      setFilteredSuggestions(filtered);
      setShowDropdown(true);
    } catch (err) {
      console.error('Fetching suggestions failed:', err);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const segments = val.split('&');
    const lastSegment = segments[segments.length - 1].trim().toLowerCase();
    const filtered = suggestions.filter((s) =>
      s.name.toLowerCase().includes(lastSegment)
    );

    setFilteredSuggestions(filtered);
    setShowDropdown(lastSegment.length > 0 || val.endsWith('&') || val.endsWith(' '));
  };

  const handleInputClick = () => {
    const segments = input.split('&');
    const lastSegment = segments[segments.length - 1].trim().toLowerCase();
    const filtered = suggestions.filter((s) =>
      s.name.toLowerCase().includes(lastSegment)
    );
    setFilteredSuggestions(filtered);

    const shouldShow = lastSegment.length > 0 || input.endsWith('&') || input.endsWith(' ') || input.trim().length < 1;
    setShowDropdown(shouldShow);
  };

  const handleSuggestionClick = (name) => {
    const segments = input.split('&');
    segments[segments.length - 1] = name.trim();
    let newInput = segments.map(s => s.trim()).join(' & ') + ' & ';

    setInput(newInput);
    inputRef.current?.focus();

    const filtered = suggestions.filter((s) =>
      s.name.toLowerCase().includes('')
    );
    setFilteredSuggestions(filtered);
    setShowDropdown(true);
  };


  return (
    <div className="submit-profile-container">
      <Card className="submit-profile-card">
        <CardHeader className="submit-profile-header">
          <CardTitle className="submit-profile-title">Submit a Social Media Profile</CardTitle>
        </CardHeader>
        <CardContent className="submit-profile-content">
          <form onSubmit={handleSubmit} className="submit-profile-form" autoComplete="off">
            <div className="submit-profile-field">
              <Label htmlFor="platform" className="submit-profile-label">Platform</Label>
              <Select value={platform} onValueChange={(val) => {
                setPlatform(val);
                setInput('');
                setToken('');
                setError('');
                setSuggestions([]);
                setFilteredSuggestions([]);
                setShowDropdown(false);
              }}>
                <SelectTrigger className="submit-profile-select">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="submit-profile-platform-dropdown">
                  <SelectItem className="submit-profile-platform-dropdown-item" value="Reddit">Reddit</SelectItem>
                  <SelectItem className="submit-profile-platform-dropdown-item" value="Bluesky">Bluesky</SelectItem>
                  <SelectItem className="submit-profile-platform-dropdown-item" value="X" disabled>X</SelectItem>
                  <SelectItem className="submit-profile-platform-dropdown-item" value="Facebook" disabled>Facebook</SelectItem>
                  <SelectItem className="submit-profile-platform-dropdown-item" value="Instagram" disabled>Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {platform && (
              <div className="submit-profile-field">
                <Label htmlFor="profile" className="submit-profile-label">Profile</Label>
                <div className="submit-profile-autocomplete-wrapper">
                  <Input
                    type="text"
                    className="submit-profile-input"
                    placeholder={platformPlaceholders[platform] || 'Enter profile'}
                    value={input}
                    ref={inputRef}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onClick={handleInputClick}
                  />
                  {showDropdown && filteredSuggestions.length > 0 && (
                    <ul className="submit-profile-suggestions">
                      {filteredSuggestions.map((sugg) => (
                        <li
                          key={sugg.name}
                          className="submit-profile-suggestion-item"
                          onClick={() => handleSuggestionClick(sugg.name)}
                        >
                          {sugg.owned ? <b>⭐ {sugg.name}</b> : sugg.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {platform === 'Bluesky' && !token && (
              <>
                <div className="submit-profile-field">
                  <Label htmlFor="bluesky-username" className="submit-profile-label">Bluesky Username</Label>
                  <Input
                    id="bluesky-username"
                    type="text"
                    className="submit-profile-input"
                    value={blueskyUsername}
                    onChange={(e) => setBlueskyUsername(e.target.value)}
                    placeholder="e.g., your.bsky.social"
                  />
                </div>

                <div className="submit-profile-field">
                  <Label htmlFor="bluesky-password" className="submit-profile-label">Password</Label>
                  <Input
                    id="bluesky-password"
                    type="password"
                    className="submit-profile-input"
                    value={blueskyPassword}
                    onChange={(e) => setBlueskyPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleBlueskyLogin}
                  className="submit-signin-button platform-bluesky-btn"
                >
                </Button>
              </>
            )}

            {!token && platform && platform !== 'Bluesky' && (
              <Button
                type="button"
                onClick={handleSignIn}
                className={`submit-signin-button platform-${platform.toLowerCase()}-btn`}
              >
              </Button>
            )}

            <Button
              type="submit"
              disabled={!platform || !input || isSubmitting}
              className="submit-profile-button"
            >
              {isSubmitting ? <span className="loading-spinner"></span> : 'Submit Profile'}
            </Button>
          </form>

          {error && <p className="submit-profile-error">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

SubmitProfile.propTypes = {
  onResult: PropTypes.func,
};
