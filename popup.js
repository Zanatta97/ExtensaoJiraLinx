/*alert(
  "Lembre-se de logar no jira antes de usar a extensão!\r\n" +
    "Caso não tenha login, acesse por algum caso do SF com Issue vinculada.",
);*/

function realizarPesquisa() {
  var urlFinal = "";

  if (
    document.getElementById("autoInput").value &&
    document.getElementById("textoInput").value
  ) {
    alert("Preencha APENAS UM dos campos!");
  } else if (document.getElementById("autoInput").value) {
    // Substitua pela URL interna da sua empresa
    urlFinal = `https://jira.linx.com.br/browse/AUTO-${document.getElementById("autoInput").value}`;
    // Abre a URL em uma nova aba
    chrome.tabs.create({ url: urlFinal });
  } else if (document.getElementById("textoInput").value) {
    urlFinal = `https://jira.linx.com.br/browse/AUTO-99999?filter=19917&jql=project%20%3D%20AUTO%20AND%20text%20~%20${encodeURIComponent(document.getElementById("textoInput").value)}%20ORDER%20BY%20key%20DESC%2C%20Rank%20DESC`;
    //urlFinal = `https://suaempresa.atlassian.net/browse/${encodeURIComponent(document.getElementById("pesquisaInput").value)}`;
    // Abre a URL em uma nova aba
    chrome.tabs.create({ url: urlFinal });
  } else {
    alert("Digite um valor!");
  }
}

document
  .getElementById("btnPesquisar")
  .addEventListener("click", realizarPesquisa);

// 2. Escuta a tecla Enter nos inputs
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
