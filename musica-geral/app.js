//////////////////////////////////////////////////////
// NORMALIZAR TEXTO
//////////////////////////////////////////////////////

function normalizar(texto) {
  return texto
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

//////////////////////////////////////////////////////
// NAVEGAÇÃO
//////////////////////////////////////////////////////

let historico = JSON.parse(localStorage.getItem("historico")) || [];

function irPara(pagina) {
  historico.push(window.location.pathname);
  localStorage.setItem("historico", JSON.stringify(historico));
  window.location.href = pagina;
}

function voltarSistema() {
  let historico = JSON.parse(localStorage.getItem("historico")) || [];
  const ultima = historico.pop();
  localStorage.setItem("historico", JSON.stringify(historico));
  window.location.href = ultima || "index.html";
}

function voltarPagina() {
  voltarSistema();
}

//////////////////////////////////////////////////////
// FILTROS
//////////////////////////////////////////////////////

let filtroAtual = "todos";
let filtroEvento = "todos";
let filtroPessoa = "";

//////////////////////////////////////////////////////
// EVENTOS DOM
//////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", () => {

  const selectMin = document.getElementById("filtroMinisterio");
  const selectEv = document.getElementById("filtroEvento");
  const inputBusca = document.getElementById("buscaNome");

  if (selectMin) {
    selectMin.addEventListener("change", () => {
      filtroAtual = normalizar(selectMin.value);
      carregarRespostas();
    });
  }

  if (selectEv) {
    selectEv.addEventListener("change", () => {
      filtroEvento = normalizar(selectEv.value);
      carregarRespostas();
    });
  }

  if (inputBusca) {
    inputBusca.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        aplicarBusca();
      }
    });
  }

});

//////////////////////////////////////////////////////
// BUSCA
//////////////////////////////////////////////////////

function aplicarBusca() {
  const input = document.getElementById("buscaNome");
  filtroPessoa = normalizar(input.value);
  carregarRespostas();
}

//////////////////////////////////////////////////////
// CARREGAR RESPOSTAS
//////////////////////////////////////////////////////

async function carregarRespostas() {

  const { data } = await supabase
    .from("disponibilidades")
    .select("*");

  const lista = document.getElementById("lista-respostas");
  if (!lista) return;

  lista.innerHTML = "";

  let eventos = {};
  let eventosUnicos = new Set();

  data.forEach(item => {

    if (
      filtroAtual !== "todos" &&
      normalizar(item.ministerio) !== filtroAtual
    ) return;

    if (
      filtroEvento !== "todos" &&
      normalizar(item.evento) !== filtroEvento
    ) return;

    if (
      filtroPessoa &&
      !normalizar(item.nome_pessoa).includes(filtroPessoa)
    ) return;

    const chave = `${item.evento} - ${item.turno}`;
    eventosUnicos.add(item.evento);

    if (!eventos[chave]) eventos[chave] = [];
    eventos[chave].push(item);
  });

  // Preencher select de eventos (sem resetar)
  const selectEvento = document.getElementById("filtroEvento");

  if (selectEvento && selectEvento.options.length <= 1) {
    eventosUnicos.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev;
      opt.textContent = ev;
      selectEvento.appendChild(opt);
    });
  }

  // Renderização
  Object.keys(eventos).forEach(evento => {

    const div = document.createElement("div");
    div.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = evento;

    div.appendChild(titulo);

    const container = document.createElement("div");
    container.className = "nomes-container";

    eventos[evento].forEach(pessoa => {

      const tag = document.createElement("div");
      tag.className = "nome-tag";

      let info = "";

      if (pessoa.editado_por) {
        const data = new Date(pessoa.editado_em).toLocaleString("pt-BR");
        info = `<div class="editado-info">
          Editado por ${pessoa.editado_por} em ${data}
        </div>`;
      }

      tag.innerHTML = `
        <div onclick="editarDisponibilidade('${pessoa.id}')" style="cursor:pointer;">
          ${pessoa.nome_pessoa} (${pessoa.ministerio})
        </div>
        ${info}
      `;

      container.appendChild(tag);
    });

    div.appendChild(container);
    lista.appendChild(div);
  });
}

//////////////////////////////////////////////////////
// EDITAR DISPONIBILIDADE
//////////////////////////////////////////////////////

async function editarDisponibilidade(id) {

  const novoTurno = prompt("Editar turno:");

  if (!novoTurno) return;

  const user = (await supabase.auth.getUser()).data.user;

  await supabase
    .from("disponibilidades")
    .update({
      turno: novoTurno,
      editado_por: user?.email || "coordenação",
      editado_em: new Date().toISOString()
    })
    .eq("id", id);

  carregarRespostas();
}