function realizarPesquisa() {
  var urlFinal = "";

  if (
    document.getElementById("autoInput").value &&
    document.getElementById("textoInput").value
  ) {
    alert("Preencha APENAS UM dos campos!");
  } else if (document.getElementById("autoInput").value) {
    urlFinal = `https://jira.linx.com.br/browse/AUTO-${document.getElementById("autoInput").value}`;

    openJiraWithAutoLogin(urlFinal);
  } else if (document.getElementById("textoInput").value) {
    urlFinal = `https://jira.linx.com.br/browse/AUTO-99999?filter=19917&jql=project%20%3D%20AUTO%20AND%20text%20~%20${encodeURIComponent(document.getElementById("textoInput").value)}%20ORDER%20BY%20key%20DESC%2C%20Rank%20DESC`;
    openJiraWithAutoLogin(urlFinal);
  } else {
    alert("Digite um valor!");
  }
}

document
  .getElementById("btnPesquisar")
  .addEventListener("click", realizarPesquisa);

const inputs = [
  document.getElementById("autoInput"),
  document.getElementById("textoInput"),
];

inputs.forEach((input) => {
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      realizarPesquisa();
    }
  });
});

function openJiraWithAutoLogin(url) {
  chrome.storage.local.set(
    {
      originalUrl: url,
      autoLoginEnabled: true,
    },
    () => {
      chrome.tabs.create({ url: url }, (tab) => {
        chrome.runtime.sendMessage({ acao: "monitorarAba", tabId: tab.id });
      });
    },
  );
}
