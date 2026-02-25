chrome.storage.local.set({
  jiraUser: "amlyYS5zdXBvcnRl",
  jiraPass: "UyFzdDNtYUBKMXI0LTIwMjA=",
  //jiraUser: "c2FtdWVsLnphbmF0dGE=",
  //jiraPass: "U2FtODE1MDUxNTcxNA==",
});

let abaAguardandoReload = null;
let onTabUpdatedGlobal = null; // Guarda referência para remover depois

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.acao === "monitorarAba") {
    console.log("Monitorando aba:", message.tabId);
    abaAguardandoReload = message.tabId;

    // Remove listener anterior se existir
    if (onTabUpdatedGlobal) {
      chrome.tabs.onUpdated.removeListener(onTabUpdatedGlobal);
    }

    let injecoes = 0;
    const MAX_INJECOES = 5;
    let urlOriginalSalva = false;

    onTabUpdatedGlobal = function (tabId, changeInfo, tab) {
      if (tabId !== abaAguardandoReload || changeInfo.status !== "complete")
        return;

      // Salva a URL original (primeira URL que não seja de login)
      if (!urlOriginalSalva && tab.url && !tab.url.includes("/login")) {
        chrome.storage.local.set({ urlOriginal: tab.url });
        console.log("URL original salva:", tab.url);
        urlOriginalSalva = true;
      }

      injecoes++;
      console.log(`Carga ${injecoes} completa, injetando script...`);
      injetarScript(tabId);

      if (injecoes >= MAX_INJECOES) {
        console.log("Máximo de injeções atingido, removendo listener.");
        chrome.tabs.onUpdated.removeListener(onTabUpdatedGlobal);
        onTabUpdatedGlobal = null;
        abaAguardandoReload = null;
      }
    };

    chrome.tabs.onUpdated.addListener(onTabUpdatedGlobal);
  }

  if (message.acao === "loginConcluido") {
    console.log("Login concluído, parando monitoramento.");
    console.log("Aba aguardando reload:", abaAguardandoReload);

    // Para o monitoramento imediatamente
    if (onTabUpdatedGlobal) {
      chrome.tabs.onUpdated.removeListener(onTabUpdatedGlobal);
      onTabUpdatedGlobal = null;
    }

    const tabIdParaRedirecionar = abaAguardandoReload;
    abaAguardandoReload = null;

    // Lê a URL antes do setTimeout para garantir que está salva
    chrome.storage.local.get(["urlOriginal"], (data) => {
      console.log("URL original encontrada:", data.urlOriginal);
      console.log("Tab ID para redirecionar:", tabIdParaRedirecionar);

      if (!data.urlOriginal) {
        console.error("URL original não encontrada no storage!");
        return;
      }

      if (!tabIdParaRedirecionar) {
        console.error("Tab ID não encontrado!");
        return;
      }

      // Aguarda 3 segundos antes de redirecionar
      setTimeout(() => {
        console.log("Executando redirect para:", data.urlOriginal);
        chrome.tabs.update(tabIdParaRedirecionar, { url: data.urlOriginal });
        chrome.storage.local.remove("urlOriginal");
      }, 3000);
    });
  }
});

function injetarScript(tabId) {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    })
    .then(() => console.log("Script injetado com sucesso!"))
    .catch((err) => console.error("Erro ao injetar:", err));
}
