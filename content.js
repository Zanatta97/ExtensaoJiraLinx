//Preenche os dados do form de login e dispara o click do botão de submit
function preencherLogin() {
  const userField = document.getElementById("login-form-username");
  const passField = document.getElementById("login-form-password");
  const submitBtn = document.getElementById("login-form-submit");
  const rememberMe = document.getElementById("login-form-remember-me");

  if (userField && passField) {
    chrome.storage.local.get(["jiraUser", "jiraPass"], (data) => {
      if (data.jiraUser && data.jiraPass) {
        userField.value = atob(data.jiraUser); // Decodifica de Base64
        passField.value = atob(data.jiraPass); // Decodifica de Base64

        if (rememberMe && !rememberMe.checked) {
          rememberMe.checked = true;
          rememberMe.dispatchEvent(new Event("change", { bubbles: true }));
        }

        submitBtn.click();

        chrome.runtime.sendMessage({ acao: "loginConcluido" });
      } else {
        console.error("Credenciais não encontradas no Storage da extensão.");
      }
    });
  }
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
    matchingElement.click();
    return;
  }

  const observer = new MutationObserver((mutations, obs) => {
    const elemento = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;

    if (elemento) {
      elemento.click();
      chrome.runtime.sendMessage({ acao: "injetarScript" });
      obs.disconnect();
      return;
    }

    const elementoLogin = document.getElementById("login-form-username");
    if (elementoLogin) {
      obs.disconnect();
      return;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

//Valida se a URL atual é a de login do Jira e inicia o processo de monitoramento
if (window.location.href.includes("jira.linx.com.br/login")) {
  aguardarElementoEExecutar();
  preencherLogin();
}
