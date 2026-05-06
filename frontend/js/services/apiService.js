(function () {
  const API_URL = "/external/environment";

  function getApiBaseUrl() {
    return window.location.origin.startsWith("http") ? window.location.origin : "http://localhost:3001";
  }

  async function getAmbientalData() {
    try {
      const response = await fetch(`${getApiBaseUrl()}${API_URL}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erro ao buscar dados do servidor");
      }

      return data;
    } catch (error) {
      console.error("Erro na requisição:", error);
      throw error;
    }
  }

  window.apiService = {
    getAmbientalData
  };
})();
