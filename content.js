//Preenche os dados do form de login e dispara o click do botão de submit
function preencherLogin() {
  const userField = document.getElementById("login-form-username");
  const passField = document.getElementById("login-form-password");
  const submitBtn = document.getElementById("login-form-submit");
  const rememberMe = document.getElementById("login-form-remember-me");

  if (!userField || !passField || !submitBtn) {
    console.log("Campos do formulário não encontrados ainda, aguardando...");
    return false;
  }

  chrome.storage.local.get(["jiraUser", "jiraPass"], (data) => {
    if (!data.jiraUser || !data.jiraPass) {
      console.error("Credenciais não encontradas no Storage da extensão.");
      return;
    }

    try {
      //Usa eventos nativos do react para preencher os campos,
      //garantindo que o Jira detecte as mudanças
      const nativeSetter = Object.getOwnPropertyDescriptor(
        globalThis.HTMLInputElement.prototype,
        "value",
      ).set;

      const decodedUser = atob(data.jiraUser);
      const decodedPass = atob(data.jiraPass);

      console.log("Preenchendo campos de login...");

      nativeSetter.call(userField, decodedUser);
      userField.dispatchEvent(new Event("input", { bubbles: true }));
      userField.dispatchEvent(new Event("change", { bubbles: true }));

      nativeSetter.call(passField, decodedPass);
      passField.dispatchEvent(new Event("input", { bubbles: true }));
      passField.dispatchEvent(new Event("change", { bubbles: true }));

      // Verifica se os campos foram preenchidos corretamente
      if (userField.value !== decodedUser || passField.value !== decodedPass) {
        console.error("Erro ao preencher campos! Valores não foram definidos.");
        return;
      }

      console.log("Campos preenchidos com sucesso!");

      if (rememberMe && !rememberMe.checked) {
        rememberMe.checked = true;
        rememberMe.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // Aguarda um pouco antes de clicar para garantir que React processou as mudanças
      setTimeout(() => {
        console.log("Clicando no botão de submit...");
        submitBtn.click();

        // Aguarda o login ser processado antes de notificar
        aguardarLoginCompleto();
      }, 500);
    } catch (error) {
      console.error("Erro ao preencher login:", error);
    }
  });

  return true;
}

//Função criada para monitorar abas do jira
//Caso detecte o botão de continuar para login, dispara o click
//Caso detecte os campos do form de login, para o monitoramento
//Desta forma a execução segue para preencher o login
function aguardarElementoEExecutar() {
  const xpath =
    "//span[contains(text(), 'Continuar com nome de usuário e senha')]";

  const matchingElement = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;

  if (matchingElement) {
    console.log("Botão 'Continuar com usuário/senha' encontrado, clicando...");
    matchingElement.click();
    return;
  }

  let timeoutId = null;
  const observer = new MutationObserver((mutations, obs) => {
    const elemento = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;

    if (elemento) {
      console.log(
        "Botão 'Continuar com usuário/senha' detectado via observer, clicando...",
      );
      elemento.click();
      clearTimeout(timeoutId);
      obs.disconnect();
    } else if (document.getElementById("login-form-username")) {
      console.log("Form de login detectado, desconectando observer");
      clearTimeout(timeoutId);
      obs.disconnect();
    }
  });

  // Timeout para evitar observer infinito (5 segundos)
  timeoutId = setTimeout(() => {
    console.log("Timeout ao aguardar elemento, desconectando observer");
    observer.disconnect();
  }, 5000);

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

//Aguarda o login ser completado monitorando mudanças de URL ou detecção de sucesso
function aguardarLoginCompleto() {
  let tentativas = 0;
  const maxTentativas = 30; // 30 segundos com verificação a cada 1s

  const verificarLoginCompleto = setInterval(() => {
    tentativas++;

    // Verifica se saiu da página de login (mudança de URL)
    if (!globalThis.location.href.includes("/login")) {
      console.log(
        "Login completo detectado! URL mudou para:",
        globalThis.location.href,
      );
      clearInterval(verificarLoginCompleto);

      // Aguarda um pouco mais para garantir que a página carregou
      setTimeout(() => {
        chrome.runtime.sendMessage({ acao: "loginConcluido" });
      }, 1000);
      return;
    }

    // Verifica se o form de login desapareceu (indicativo de sucesso)
    const loginForm = document.getElementById("login-form-username");
    if (!loginForm) {
      console.log("Form de login desapareceu, login provavelmente concluído");
      clearInterval(verificarLoginCompleto);

      setTimeout(() => {
        chrome.runtime.sendMessage({ acao: "loginConcluido" });
      }, 1000);
      return;
    }

    // Timeout após 30 segundos
    if (tentativas >= maxTentativas) {
      console.warn("Timeout aguardando login completo após 30 segundos");
      clearInterval(verificarLoginCompleto);
      chrome.runtime.sendMessage({ acao: "loginConcluido" });
    }
  }, 1000);
}

function clicarPrimeiroResultadoPesquisa() {
  const urlAtual = globalThis.location.href;
  const paginaPesquisa =
    urlAtual.includes("/browse/") &&
    (document.querySelector(".issue-list .splitview-issue-link") ||
      document.querySelector(".issue-list li a") ||
      document.querySelector("a.splitview-issue-link"));

  if (!paginaPesquisa) {
    return false;
  }

  const resultado =
    document.querySelector(".issue-list .splitview-issue-link") ||
    document.querySelector(".issue-list li a") ||
    document.querySelector("a.splitview-issue-link");

  if (!resultado) {
    return false;
  }

  if (globalThis.__jiraLinxPrimeiroResultadoClicado) {
    return true;
  }

  globalThis.__jiraLinxPrimeiroResultadoClicado = true;

  setTimeout(() => {
    console.log("Clicando no primeiro resultado da pesquisa...");
    resultado.click();
  }, 800);

  return true;
}

//Valida se a URL atual é a de login do Jira e inicia o processo de monitoramento
if (globalThis.location.href.includes("jira.linx.com.br/login")) {
  console.log("Página de login detectada, iniciando fluxo de autenticação...");
  aguardarElementoEExecutar();

  // Tenta preencher login com um pequeno delay para garantir que DOM está pronto
  setTimeout(() => {
    preencherLogin();
  }, 1000);
} else {
  const observer = new MutationObserver(() => {
    if (clicarPrimeiroResultadoPesquisa()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => {
    if (clicarPrimeiroResultadoPesquisa()) {
      observer.disconnect();
    }
  }, 2000);
}
