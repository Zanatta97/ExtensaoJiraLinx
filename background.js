//Dados de Login em Base64 para evitar exposição direta,
//mesmo que seja facilmente reversível
chrome.storage.local.set({
  jiraUser: "amlyYS5zdXBvcnRl",
  jiraPass: "UyFzdDNtYUBKMXI0LTIwMjA=",
});

let abaAguardandoReload = null;
let onTabUpdatedGlobal = null;
let loginDetectado = false;
let redirecionamentoExecutado = false;
let redirecionamentoPendente = false;
let urlDestinoPendente = null;

function encerrarMonitoramento() {
  if (onTabUpdatedGlobal) {
    chrome.tabs.onUpdated.removeListener(onTabUpdatedGlobal);
    onTabUpdatedGlobal = null;
  }

  abaAguardandoReload = null;
  loginDetectado = false;
  redirecionamentoPendente = false;
  urlDestinoPendente = null;
}

function redirecionarParaURL(tabId, destino) {
  if (redirecionamentoExecutado) {
    return;
  }

  redirecionamentoExecutado = true;
  urlDestinoPendente = destino;

  setTimeout(() => {
    console.log("Executando redirect para:", destino);
    chrome.tabs.update(tabId, { url: destino }, () => {
      if (chrome.runtime.lastError) {
        console.error("Erro ao redirecionar:", chrome.runtime.lastError);
      } else {
        chrome.storage.local.remove("urlOriginal");
      }
    });
  }, 1000);
}

function redirecionarQuandoPaginaBaseCarregar(tabId, urlDestino) {
  if (!redirecionamentoPendente) {
    return;
  }

  chrome.tabs.get(tabId, (tabAtual) => {
    if (chrome.runtime.lastError || !tabAtual?.url) {
      return;
    }

    const urlAtual = tabAtual.url;
    if (urlAtual.includes("/login")) {
      return;
    }

    console.log(
      "Página básica do Jira carregou, redirecionando para a pesquisa:",
      urlAtual,
      "->",
      urlDestino,
    );
    redirecionamentoPendente = false;
    redirecionarParaURL(tabId, urlDestino);
  });
}

//Adiciona um listener para mensagens vindas do popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.acao === "monitorarAba") {
    console.log("Monitorando aba:", message.tabId);
    abaAguardandoReload = message.tabId;
    loginDetectado = false;
    redirecionamentoExecutado = false;
    redirecionamentoPendente = false;

    // Remove listener anterior se existir
    if (onTabUpdatedGlobal) {
      chrome.tabs.onUpdated.removeListener(onTabUpdatedGlobal);
    }

    let injecoes = 0;
    let urlOriginalSalva = false;

    //Como a aba do Jira pode passar por vários redirecionamentos durante o login,
    //são monitoradas as atualizações da aba para detectar quando o login é concluído
    //e redirecionar para a URL original
    onTabUpdatedGlobal = function (tabId, changeInfo, tab) {
      if (tabId !== abaAguardandoReload || changeInfo.status !== "complete")
        return;

      const urlAtual = typeof tab.url === "string" ? tab.url : "";

      console.log(
        `[${new Date().toLocaleTimeString()}] Aba atualizada: ${urlAtual}`,
      );

      // Verifica se a URL original foi salva (feito em popup.js)
      // Não sobrescreve a URL já salva com a URL pós-login
      if (!urlOriginalSalva && urlAtual && !urlAtual.includes("/login")) {
        chrome.storage.local.get(["urlOriginal"], (data) => {
          if (data.urlOriginal) {
            console.log(
              "URL original já estava salva em popup.js:",
              data.urlOriginal,
            );
          } else {
            chrome.storage.local.set({ urlOriginal: tab.url });
            console.log("URL original salva no background:", tab.url);
          }
        });
        urlOriginalSalva = true;
      }

      if (urlAtual.includes("/login")) {
        loginDetectado = true;
      }

      if (loginDetectado && !urlAtual.includes("/login")) {
        redirecionamentoPendente = true;
      }

      if (urlDestinoPendente && urlAtual === urlDestinoPendente) {
        console.log(
          "URL final da busca carregou, injetando clique no primeiro resultado.",
        );
        injetarScript(tabId);
        encerrarMonitoramento();
        return;
      }

      // Quando o Jira sai do login e entra em uma página diferente da URL original,
      // redireciona imediatamente para a busca solicitada.
      if (
        loginDetectado &&
        redirecionamentoPendente &&
        !redirecionamentoExecutado &&
        urlAtual &&
        !urlAtual.includes("/login")
      ) {
        chrome.storage.local.get(["urlOriginal"], (data) => {
          if (!data.urlOriginal) {
            console.error("URL original não encontrada no storage!");
            return;
          }

          if (urlAtual !== data.urlOriginal) {
            redirecionarQuandoPaginaBaseCarregar(tabId, data.urlOriginal);
          }
        });
      }

      // Injeta o script apenas na carga inicial e quando entramos na tela de login
      if (injecoes === 0 || urlAtual.includes("/login")) {
        injecoes++;
        console.log(`Carga ${injecoes} completa, injetando script`);
        injetarScript(tabId);
      }
    };

    chrome.tabs.onUpdated.addListener(onTabUpdatedGlobal);
  }

  if (message.acao === "loginConcluido") {
    console.log("Login concluído, parando monitoramento.");
    console.log("Aba aguardando reload:", abaAguardandoReload);

    const tabIdParaRedirecionar = abaAguardandoReload;

    // Validação dupla do tabId
    if (!tabIdParaRedirecionar) {
      console.error("Tab ID não encontrado!");
      return;
    }

    // Lê a URL e redireciona
    chrome.storage.local.get(["urlOriginal"], (data) => {
      console.log("URL original encontrada:", data.urlOriginal);
      console.log("Tab ID para redirecionar:", tabIdParaRedirecionar);

      if (!data.urlOriginal) {
        console.error("URL original não encontrada no storage!");
        return;
      }

      redirecionamentoPendente = true;
      redirecionarQuandoPaginaBaseCarregar(
        tabIdParaRedirecionar,
        data.urlOriginal,
      );
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
