export default async function handler(req, res) {
  const ZIP_URL =
    "https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip";

  try {
    const response = await fetch(ZIP_URL);

    if (!response.ok) {
      res.status(response.status).send("Failed to fetch ZIP");
      return;
    }

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy failed");
  }
}