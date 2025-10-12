const chapterUrl = 'https://novelbin.com/b/classroom-of-the-elite/chapter-vol-1-ch-1';

async function fetchChapterContent() {
  // Hardcoded CSRF token and cookie as per the curl example
  const csrfToken = 'hlkrI1xr-YaP6A9fdnU3YaNLQerL65RvAEuQ';
  const cookie = '_csrf=K_n2bdQ016rSb6IC8jfzZWII;';

  // Prepare POST data
  const params = new URLSearchParams();
  params.set('novel_id', 'classroom-of-the-elite');
  params.set('chapter_id', 'chapter-vol-1-ch-1');
  params.set('_csrf', csrfToken);

  // Make the POST request using Bun's fetch
  const response = await fetch('https://novelbin.com/ajax/show-full-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.text();
  console.log(data);
}

fetchChapterContent().catch(console.error);