import { serve } from "bun";

const ZIP_URL =
  "https://github.com/stephenmk/stephenmk.github.io/releases/latest/download/jitendex-yomitan.zip";

serve({
  port: 3000,
fetch: async () => {
    try {
      const res = await fetch(ZIP_URL);
      const buffer = await res.arrayBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type": "application/zip",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.error(err);
      return new Response("Proxy error", { status: 500 });
    }
  },
});

console.log("✅ Bun proxy running at http://localhost:3000");