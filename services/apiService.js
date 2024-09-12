import axios from "axios";

const apiKey = process.env.API_KEY;
const searchEngineId = process.env.SEARCH_ENGINE_ID;

export async function fetchImageUrl(query) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&searchType=image&q=${encodeURIComponent(
    query
  )}&num=1`;
  try {
    const response = await axios.get(url);
    const items = response.data.items;
    if (items && items.length > 0) {
      return items[0].link;
    } else {
      console.log("No images found");
      return 'url("/images/429-status-code.png")';
    }
  } catch (error) {
    console.error("Couldn't download an image from API", error);
    return 'url("/images/429-status-code.png")';
  }
}
