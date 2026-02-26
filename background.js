//Dados de Login em Base64 para evitar exposição direta,
//mesmo que seja facilmente reversível
chrome.storage.local.set({
  jiraUser: "amlyYS5zdXBvcnRl",
  jiraPass: "UyFzdDNtYUBKMXI0LTIwMjA=",
});

let abaAguardandoReload = null;
let onTabUpdatedGlobal = null;

//Adiciona um listener para mensagens vindas do popup.js
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

    //Como a aba do Jira pode passar por vários redirecionamentos durante o login,
    //são monitoradas as atualizações da aba para detectar quando o login é concluído
    //e redirecionar para a URL original
    onTabUpdatedGlobal = function (tabId, changeInfo, tab) {
      if (tabId !== abaAguardandoReload || changeInfo.status !== "complete")
        return;

      // Salva a URL original (primeira URL que não seja de login)
      if (!urlOriginalSalva && tab.url && !tab.url.includes("/login")) {
        chrome.storage.local.set({ urlOriginal: tab.url });
        console.log("URL original salva:", tab.url);
        urlOriginalSalva = true;
      }

      //Injeta o script na aba
      injecoes++;
      console.log(`Carga ${injecoes} completa, injetando script`);
      injetarScript(tabId);

      //Definido limite de 5 injeções para evitar loops infinitos
      //caso algo dê errado no processo de login
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

//injeta o script do content.js na abda do Jira
function injetarScript(tabId) {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    })
    .then(() => console.log("Script injetado com sucesso!"))
    .catch((err) => console.error("Erro ao injetar:", err));
}
