const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline-sync');
const fs = require('fs');
const path = require('path');

const defaultUserID = 'efe081b6-5d1a-4785-8bf7-5485ac989b7b';
const defaultRedditUser = 'asv2077';
const defaultBlueskyUser = 'socialsentrix.bsky.social';
const defaultLoginUser = 'socialsentrix@gmail.com';
const defaultLoginPass = 'SocialF!!';
const startDateTime = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
const endDateTime = new Date().toISOString();

const HOST = 'http://localhost:8080';

function saveResponseToFile(platform, profile, endpoint, userID, data) {
  const folder = path.join(__dirname, 'apitest');
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const safeProfile = profile.replace(/[<>:"/\\|?*\n\r]/g, '_');
  const safeEndpoint = endpoint.replace(/[<>:"/\\|?*\n\r]/g, '_');

  let safeUserID = userID ? userID.replace(/[<>:"/\\|?*\n\r]/g, '_') : null;
  if (!safeUserID) {
    safeUserID = 'unknownUser';
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${platform}-${safeProfile}-${safeEndpoint}-(${safeUserID})-[${timestamp}].json`;
  const filepath = path.join(folder, filename);

  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved response to: ${filepath}`);
  } catch (err) {
    console.warn(`⚠️ Could not save file: ${err.message}`);
  }
}

async function makeRequest({ platform, endpoint, method = 'GET', query = {}, body = null, username = null, userID }) {
  const queryParams = new URLSearchParams(query).toString();
  const url = `${HOST}${endpoint}${queryParams ? `?${queryParams}` : ''}`;

  const headers = {
    'Cookie': `userID=${userID}`
  };
  if (body) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    const endpointLastSegment = endpoint.split('/').filter(Boolean).pop();

    if (res.ok && isJson) {
      saveResponseToFile(platform, username || 'setic', endpointLastSegment, userID, data);
    } else {
      console.error(`❌ Request failed: ${res.status} ${res.statusText}`);
      console.log('\n🔎 Error response:');
      console.log(data);
    }
  } catch (err) {
    console.error(`❌ Request error: ${err.message}`);
  }
}

async function main() {
  const userID = readline.question(`Enter your userID (default: ${defaultUserID}): `) || defaultUserID;

  while (true) {
    console.log('\nChoose an option:');
    console.log('1: reddit get profile');
    console.log('2: reddit login');
    console.log('3: reddit setic');
    console.log('4: bluesky get profile');
    console.log('5: bluesky login');
    console.log('6: bluesky setic');
    console.log('7: twitter login');
    console.log('0: exit');
    console.log('\n');

    const choice = readline.question('Your choice: ');

    switch (choice) {
      case '1': {
        const username = readline.question(`Enter Reddit username (default: ${defaultRedditUser}): `) || defaultRedditUser;

        await makeRequest({
          platform: 'reddit',
          endpoint: '/api/reddit/profile',
          method: 'POST',
          body: { username },
          username,
          userID
        });

        break;
      }

      case '2': {
        const res = await fetch(`${HOST}/api/reddit/auth`, {
          headers: {
            'Cookie': `userID=${userID}`,
            'Accept': 'application/json'
          }
        });

        const data = await res.json();

        if (data.url) {
          console.log('\n🔗 Open this URL in your browser to authorize Reddit:');
          console.log(data.url);
          console.log('\nAfter logging in and approving, press Enter to continue once redirected back...');
          readline.question();
          console.log('✅ If redirected, the token was stored in the backend.');
        } else {
          console.error('❌ Could not get Reddit login URL:', data);
        }

        break;
      }

      case '3': {
        const username = readline.question(`Enter Reddit username (default: ${defaultRedditUser}): `) || defaultRedditUser;

        await makeRequest({
          platform: 'reddit',
          endpoint: '/api/reddit/setic',
          method: 'GET',
          query: {
            username,
            userID,
            start: startDateTime,
            end: endDateTime,
            dryRun: 'false'
          },
          username,
          userID
        });

        break;
      }

      case '4': {
        const username = readline.question(`Enter Bluesky username (default: ${defaultBlueskyUser}): `) || defaultBlueskyUser;

        await makeRequest({
          platform: 'bluesky',
          endpoint: '/api/bluesky/profile',
          method: 'POST',
          body: { username },
          username,
          userID
        });

        break;
      }

      case '5': {
        const username = readline.question(`Enter Bluesky username (default: ${defaultLoginUser}): `) || defaultLoginUser;
        const password = readline.question(`Enter Bluesky password (default: ${defaultLoginPass}): `, { hideEchoBack: true }) || defaultLoginPass;

        const res = await fetch(`${HOST}/api/bluesky/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `userID=${userID}`
          },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          console.log(`✅ Logged in as ${data.handle}`);
        } else {
          console.error('❌ Could not login:', data);
        }

        break;
      }

      case '6': {
        const username = readline.question(`Enter Bluesky username (default: ${defaultBlueskyUser}): `) || defaultBlueskyUser;

        await makeRequest({
          platform: 'reddit',
          endpoint: '/api/bluesky/setic',
          method: 'GET',
          query: {
            username,
            userID,
            start: startDateTime,
            end: endDateTime,
            dryRun: 'false'
          },
          username,
          userID
        });

        break;
      }

      case '7': {
        const username = readline.question(`Enter Twitter username (default: ${defaultLoginUser}): `) || defaultLoginUser;
        const password = readline.question(`Enter Twitter password (default: ${defaultLoginPass}): `, { hideEchoBack: true }) || defaultLoginPass;

        const res = await fetch(`${HOST}/api/twitter/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `userID=${userID}`
          },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          console.log(`✅ Logged in as ${data.handle}`);
        } else {
          console.error('❌ Could not login:', data);
        }

        break;
        break;
      }
      case '0':
        console.log('👋 Exiting...');
        return;
      default:
        console.log('❌ Invalid choice. Try again.');
    }
  }
}

main();
