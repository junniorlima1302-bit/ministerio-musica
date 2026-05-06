//////////////////////////////////////////////////////
// NORMALIZAR TEXTO
// NOTA: carregar supabase com versão fixa no HTML:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//////////////////////////////////////////////////////

function normalizar(texto) {
  return texto
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

//////////////////////////////////////////////////////
// CACHE DO MÊS DE REFERÊNCIA ATIVO
//////////////////////////////////////////////////////

let _mesRefCache = undefined; // undefined = não carregado ainda; null = sem dados

async function obterMesRefAtivo() {
  if (_mesRefCache !== undefined) return _mesRefCache;
  const { data } = await supabase
    .from("compromissos")
    .select("mes_ref")
    .not("mes_ref", "is", null)
    .order("mes_ref", { ascending: false })
    .limit(1);
  _mesRefCache = data?.[0]?.mes_ref || null;
  return _mesRefCache;
}

function invalidarCacheMesRef() {
  _mesRefCache = undefined;
}

//////////////////////////////////////////////////////
// LOADING GLOBAL
//////////////////////////////////////////////////////

function mostrarLoading(containerId, mensagem) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="loading-skeleton">
      <div class="loading-spinner"></div>
      <p class="loading-txt">${mensagem || "Carregando..."}</p>
    </div>
  `;
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
// IDENTIFICAÇÃO
//////////////////////////////////////////////////////

function continuar() {
  const nome = document.getElementById("nome")?.value;
  const ministerioSelecionado = document.querySelector('input[name="ministerio"]:checked');
  const tipoSelecionado = document.querySelector('input[name="tipo"]:checked');
  const instrumento = document.getElementById("instrumento")?.value;

  if (!nome || !ministerioSelecionado) {
    alert("Preencha seu nome e selecione o ministério.");
    return;
  }

  if (!tipoSelecionado) {
    alert("Selecione se você canta ou toca.");
    return;
  }

  if (tipoSelecionado.value === "toco" && !instrumento) {
    alert("Digite o instrumento que você toca.");
    return;
  }

  localStorage.setItem("nome", nome);
  localStorage.setItem("ministerio", ministerioSelecionado.value);
  localStorage.setItem("tipo", tipoSelecionado.value);
  localStorage.setItem("instrumento", instrumento || "");

  window.location.href = "disponibilidade.html";
}

//////////////////////////////////////////////////////
// CARREGAR DISPONIBILIDADES
//////////////////////////////////////////////////////

// obterMesRefAtivo() agora está no topo do arquivo com cache

async function carregarDisponibilidades() {

  const lista = document.getElementById("lista-disponibilidade");
  if (!lista) return;

  mostrarLoading("lista-disponibilidade", "Buscando compromissos...");

  // 🔥 busca apenas compromissos do mês ativo (usa cache)
  const mesRef = await obterMesRefAtivo();

  let query = supabase.from("compromissos").select("*").order("nome");
  if (mesRef) {
    query = query.eq("mes_ref", mesRef);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    lista.innerHTML = `<p style="color:#c0392b;text-align:center;padding:20px;">Erro ao carregar. Tente novamente.</p>`;
    return;
  }

  lista.innerHTML = "";

  let grupos = {};

  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item.turno);
  });

  Object.keys(grupos).forEach(nome => {

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const container = document.createElement("div");
    container.className = "botoes";

    grupos[nome].forEach(turno => {

      const btn = document.createElement("button");
      btn.innerText = turno;
      btn.className = "btn-disponibilidade";

      btn.dataset.valor = `${nome} | ${turno}`;

      btn.onclick = () => btn.classList.toggle("ativo");

      container.appendChild(btn);
    });

    divGrupo.appendChild(titulo);
    divGrupo.appendChild(container);
    lista.appendChild(divGrupo);
  });
}

async function enviarDisponibilidade(){

  const nome = localStorage.getItem("nome");
  const ministerio = localStorage.getItem("ministerio");

  if (!nome || !ministerio) {
    alert("Volte e preencha seus dados.");
    return;
  }

  const selecionados = document.querySelectorAll(".btn-disponibilidade.ativo");

  if (selecionados.length === 0) {
    alert("Selecione pelo menos uma opção.");
    return;
  }

  const botao = document.querySelector("button[onclick='enviarDisponibilidade()']");
  botao.disabled = true;
  botao.innerText = "Enviando...";

  // 🔥 descobre o mês de referência (usa cache — já foi buscado em carregarDisponibilidades)
  const mesRef = await obterMesRefAtivo();

  // 🔥 verifica envio anterior SOMENTE do mês de referência correto
  let buscaExistente = supabase
    .from("disponibilidades")
    .select("*")
    .eq("nome_pessoa", nome)
    .eq("ministerio", ministerio);

  if (mesRef) {
    buscaExistente = buscaExistente.eq("mes_ref", mesRef);
  } else {
    buscaExistente = buscaExistente.is("mes_ref", null);
  }

  const { data: existente, error: erroBusca } = await buscaExistente;

  if (erroBusca) {
    console.error(erroBusca);
    alert("Erro ao verificar disponibilidade.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  // 🔥 confirmação
  if (existente.length > 0) {
    const confirmar = await abrirPopupConfirmacao();

    if (!confirmar) {
      botao.disabled = false;
      botao.innerText = "Enviar";
      return;
    }
  }

 // 🔥 justificativa por data
let justificativas = null;

if (ministerio === "Música Geral") {
  justificativas = await abrirPopupJustificativa(selecionados);

  if (!justificativas) {
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }
} // 👈 ESSA CHAVE FALTAVA
  
  let dados = [];

  selecionados.forEach((btn, index) => {
    const partes = btn.dataset.valor.split("|");

    const tipo = localStorage.getItem("tipo");
    const instrumento = localStorage.getItem("instrumento");

    dados.push({
      nome_pessoa: nome,
      ministerio: ministerio,
      evento: partes[0].trim(),
      turno: partes[1].trim(),
      tipo: tipo,
      instrumento: instrumento,
      justificativa: justificativas ? justificativas[index] : null,
      mes_ref: mesRef || null
    });
  });

  // 🔥 remove respostas anteriores somente do mês de referência correto
  let deleteQuery = supabase
    .from("disponibilidades")
    .delete()
    .eq("nome_pessoa", nome)
    .eq("ministerio", ministerio);

  if (mesRef) {
    deleteQuery = deleteQuery.eq("mes_ref", mesRef);
  } else {
    deleteQuery = deleteQuery.is("mes_ref", null);
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    console.error(deleteError);
    alert("Erro ao atualizar disponibilidade.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  // 🔥 insere novo
  const { error } = await supabase
    .from("disponibilidades")
    .insert(dados);

  if (error) {
    console.error(error);
    alert("Erro ao enviar.");
    botao.disabled = false;
    botao.innerText = "Enviar";
    return;
  }

  mostrarPopup();
}

//////////////////////////////////////////////////////
// COMPROMISSOS
//////////////////////////////////////////////////////

async function carregarCompromissos() {

  const mesSelecionado = document.getElementById("filtro-mes")?.value || "todos";

  const lista = document.getElementById("lista-compromissos");
  if (!lista) return;

  mostrarLoading("lista-compromissos", "Carregando compromissos...");

  let query = supabase.from("compromissos").select("*").order("nome");

  if (mesSelecionado !== "todos") {
    query = query.eq("mes_ref", mesSelecionado);
  }

  const { data, error } = await query;

  if (error) { console.error(error); return; }

  lista.innerHTML = "";

  let grupos = {};
  data.forEach(item => {
    if (!grupos[item.nome]) grupos[item.nome] = [];
    grupos[item.nome].push(item);
  });

  Object.keys(grupos).forEach(nome => {

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo";

    const tituloLinha = document.createElement("div");
    tituloLinha.className = "linha-grupo-titulo";

    const titulo = document.createElement("h3");
    titulo.innerText = nome;

    const acoesGrupo = document.createElement("div");
    acoesGrupo.className = "acoes-grupo";
    acoesGrupo.innerHTML = `
      <button class="btn-editar-grupo" onclick="editarGrupo('${nome.replace(/'/g, "\\'")}')">✏️ Renomear</button>
      <button class="btn-adicionar-item" onclick="adicionarItemGrupo('${nome.replace(/'/g, "\\'")}')">➕ Adicionar</button>
    `;

    tituloLinha.appendChild(titulo);
    tituloLinha.appendChild(acoesGrupo);
    divGrupo.appendChild(tituloLinha);

    const container = document.createElement("div");
    container.className = "lista-itens";

    grupos[nome].forEach(item => {
      const div = document.createElement("div");
      div.className = "item-compromisso";
      div.innerHTML = `
        <label class="linha-compromisso">
          <input type="checkbox" value="${item.id}">
          <span class="texto-turno" id="texto-${item.id}">${item.turno}</span>
        </label>
        <div class="acoes-item">
          <button class="btn-editar-item" onclick="editarCompromisso('${item.id}', '${item.turno.replace(/'/g, "\\'")}')">✏️ Editar</button>
          <button class="btn-excluir-item" onclick="excluirCompromissoUnico('${item.id}')">🗑️ Excluir</button>
        </div>
      `;
      container.appendChild(div);
    });

    divGrupo.appendChild(container);
    lista.appendChild(divGrupo);
  });
}

async function editarGrupo(nomeAtual) {
  const novoNome = prompt("Renomear grupo:", nomeAtual);
  if (!novoNome || novoNome.trim() === nomeAtual) return;

  const { error } = await supabase
    .from("compromissos")
    .update({ nome: novoNome.trim() })
    .eq("nome", nomeAtual);

  if (error) { alert("Erro ao renomear grupo."); return; }
  carregarCompromissos();
}

async function adicionarItemGrupo(nomeGrupo) {
  const novoTurno = prompt(`Adicionar item ao grupo "${nomeGrupo}":`);
  if (!novoTurno || !novoTurno.trim()) return;

  const mesRef = document.getElementById("filtro-mes")?.value || obterMesAtual();

  const { error } = await supabase
    .from("compromissos")
    .insert({ nome: nomeGrupo, turno: novoTurno.trim(), mes_ref: mesRef });

  if (error) { alert("Erro ao adicionar item."); return; }
  invalidarCacheMesRef();
  carregarCompromissos();
}

function obterMesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function popularFiltroMes(data) {
  const select = document.getElementById("filtro-mes");
  if (!select) return;
  const meses = [...new Set(data.map(d => d.mes_ref).filter(Boolean))].sort().reverse();
  const mesAtual = obterMesAtual();
  select.innerHTML = `<option value="todos">Todos os meses</option>`;
  meses.forEach(mes => {
    const [ano, m] = mes.split("-");
    const label = new Date(ano, m - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const opt = document.createElement("option");
    opt.value = mes;
    opt.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    if (mes === mesAtual) opt.selected = true;
    select.appendChild(opt);
  });
}

async function iniciarCompromissos() {
  const { data } = await supabase.from("compromissos").select("mes_ref");
  if (data) popularFiltroMes(data);
  construirGradeMeses();
  carregarCompromissos();
}

//////////////////////////////////////////////////////
// POPUP DE SELEÇÃO DE MÊS DE REFERÊNCIA
//////////////////////////////////////////////////////

let mesSelecionadoPopup = null;

const MESES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function construirGradeMeses() {
  const grade = document.getElementById("grade-meses-popup");
  if (!grade) return;

  grade.innerHTML = "";

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth(); // 0-based
  const proximoMes = (mesAtual + 1) % 12;
  const anoProximo = mesAtual === 11 ? anoAtual + 1 : anoAtual;

  // Pré-seleciona o próximo mês
  mesSelecionadoPopup = `${String(anoProximo).padStart(4,"0")}-${String(proximoMes + 1).padStart(2,"0")}`;

  // Ano atual — sempre mostra os 12 meses
  const labelAno = document.createElement("div");
  labelAno.className = "ano-label";
  labelAno.textContent = anoAtual;
  grade.appendChild(labelAno);

  for (let m = 0; m < 12; m++) {
    const valor = `${anoAtual}-${String(m + 1).padStart(2, "0")}`;
    const btn = document.createElement("button");
    btn.className = "btn-mes" + (valor === mesSelecionadoPopup ? " selecionado" : "");
    btn.textContent = MESES_NOMES[m].substring(0, 3);
    btn.title = `${MESES_NOMES[m]} ${anoAtual}`;
    btn.dataset.valor = valor;
    btn.onclick = () => selecionarMesPopup(valor);
    grade.appendChild(btn);
  }

  // Em dezembro, mostra também janeiro do ano seguinte
  if (mesAtual === 11) {
    const labelAnoSeg = document.createElement("div");
    labelAnoSeg.className = "ano-label";
    labelAnoSeg.textContent = anoAtual + 1;
    grade.appendChild(labelAnoSeg);

    const valor = `${anoAtual + 1}-01`;
    const btn = document.createElement("button");
    btn.className = "btn-mes" + (valor === mesSelecionadoPopup ? " selecionado" : "");
    btn.textContent = "Jan";
    btn.title = `Janeiro ${anoAtual + 1}`;
    btn.dataset.valor = valor;
    btn.onclick = () => selecionarMesPopup(valor);
    grade.appendChild(btn);
  }
}

function selecionarMesPopup(valor) {
  mesSelecionadoPopup = valor;
  document.querySelectorAll(".btn-mes").forEach(b => {
    b.classList.toggle("selecionado", b.dataset.valor === valor);
  });
}

function abrirPopupMes() {
  const texto = document.getElementById("entrada")?.value?.trim();
  if (!texto) {
    alert("Digite os compromissos antes de cadastrar.");
    return;
  }
  // Reconstrói a grade com mês atual sempre atualizado
  construirGradeMeses();
  document.getElementById("popup-mes-ref").classList.add("aberto");
}

function fecharPopupMes() {
  document.getElementById("popup-mes-ref").classList.remove("aberto");
}

async function confirmarPopupMes() {
  if (!mesSelecionadoPopup) {
    alert("Selecione um mês.");
    return;
  }
  fecharPopupMes();
  await cadastrarTudo(mesSelecionadoPopup);
}

//////////////////////////////////////////////////////
// EDITAR COMPROMISSO INDIVIDUAL
//////////////////////////////////////////////////////

async function editarCompromisso(id, textoAtual) {
  const novoTexto = prompt("Editar compromisso:", textoAtual);
  if (!novoTexto || novoTexto.trim() === textoAtual.trim()) return;

  const { error } = await supabase
    .from("compromissos")
    .update({ turno: novoTexto.trim() })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao editar.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// EXCLUIR COMPROMISSO INDIVIDUAL
//////////////////////////////////////////////////////

async function excluirCompromissoUnico(id) {
  const confirmar = confirm("Excluir este compromisso?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao excluir.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// EXCLUIR SELECIONADOS
//////////////////////////////////////////////////////

async function excluirSelecionados() {
  const checkboxes = document.querySelectorAll("#lista-compromissos input[type='checkbox']:checked");

  if (checkboxes.length === 0) {
    alert("Selecione pelo menos um compromisso.");
    return;
  }

  const confirmar = confirm(`Excluir ${checkboxes.length} compromisso(s) selecionado(s)?`);
  if (!confirmar) return;

  const ids = Array.from(checkboxes).map(cb => cb.value);

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .in("id", ids);

  if (error) {
    console.error(error);
    alert("Erro ao excluir selecionados.");
    return;
  }

  carregarCompromissos();
}

//////////////////////////////////////////////////////
// LIMPAR TUDO
//////////////////////////////////////////////////////

async function limparTudo() {
  const confirmar = confirm("Tem certeza que deseja apagar TODOS os compromissos? Essa ação não pode ser desfeita.");
  if (!confirmar) return;

  const { error } = await supabase
    .from("compromissos")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error(error);
    alert("Erro ao limpar compromissos.");
    return;
  }

  invalidarCacheMesRef();
  carregarCompromissos();
}

//////////////////////////////////////////////////////
// CADASTRAR COMPROMISSOS
//////////////////////////////////////////////////////

async function cadastrarTudo(mesRef) {

  const texto = document.getElementById("entrada").value;

  if (!texto.trim()) {
    alert("Digite os compromissos.");
    return;
  }

  if (!mesRef) {
    alert("Selecione o mês de referência.");
    return;
  }

  const linhas = texto.split("\n").filter(l => l.trim() !== "");

  let grupoAtual = "OUTROS COMPROMISSOS";
  let dados = [];

  linhas.forEach(linha => {
    if (linha.startsWith("#")) {
      grupoAtual = linha.replace("#", "").trim().toUpperCase();
    } else {
      dados.push({ nome: grupoAtual, turno: linha, mes_ref: mesRef });
    }
  });

  const { error } = await supabase.from("compromissos").insert(dados);

  if (error) { console.error(error); alert("Erro ao cadastrar."); return; }

  invalidarCacheMesRef();
  document.getElementById("entrada").value = "";
  carregarCompromissos();
}

//////////////////////////////////////////////////////
// RESET DO MÊS
//////////////////////////////////////////////////////

async function resetarMes() {
  const mesSelecionado = document.getElementById("filtro-mes")?.value;

  if (!mesSelecionado || mesSelecionado === "todos") {
    alert("Selecione um mês específico para resetar.");
    return;
  }

  const [ano, m] = mesSelecionado.split("-");
  const label = new Date(ano, m - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const confirmar = confirm(
    `Isso vai apagar TODOS os compromissos e disponibilidades de ${label}.\n\nTem certeza?`
  );
  if (!confirmar) return;

  const { error: e1 } = await supabase
    .from("compromissos")
    .delete()
    .eq("mes_ref", mesSelecionado);

  if (e1) { alert("Erro ao apagar compromissos."); return; }

  // Apaga disponibilidades do mês de referência selecionado
  const { error: e2 } = await supabase
    .from("disponibilidades")
    .delete()
    .eq("mes_ref", mesSelecionado);

  if (e2) { alert("Compromissos apagados, mas erro ao apagar disponibilidades."); }
  else { alert(`Mês de ${label} resetado com sucesso!`); }

  invalidarCacheMesRef();
  carregarCompromissos();
}

//////////////////////////////////////////////////////
// TOGGLE INSTRUMENTO
//////////////////////////////////////////////////////

function toggleInstrumento() {
  const selecionado = document.querySelector('input[name="tipo"]:checked');
  const campo = document.getElementById("campo-instrumento");

  if (selecionado && selecionado.value === "toco") {
    campo.style.display = "block";
  } else {
    campo.style.display = "none";
  }
}
//////////////////////////////////////////////////////
// LOGOUT
//////////////////////////////////////////////////////

async function fazerLogout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

async function fazerLogin() {

  const email = document.getElementById("email")?.value;
  const senha = document.getElementById("senha")?.value;

  if (!email || !senha) {
    alert("Preencha email e senha.");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    alert("Email ou senha inválidos.");
    return;
  }

  window.location.href = "dashboard.html";
}

// Enter no login
document.addEventListener("DOMContentLoaded", () => {
  const senhaInput = document.getElementById("senha");
  if (senhaInput) {
    senhaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fazerLogin();
    });
  }
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fazerLogin();
    });
  }
});
//////////////////////////////////////////////////////
// RESPOSTAS (VISUALIZAÇÃO)
//////////////////////////////////////////////////////

let respostasGlobais = [];

let compromissosGlobais = [];

async function carregarRespostas() {

  const container = document.getElementById("lista-respostas");
  if (container) mostrarLoading("lista-respostas", "Carregando disponibilidades...");

  // 🔥 busca compromissos e mês ativo em paralelo
  const mesRef = await obterMesRefAtivo();

  let compQuery = supabase.from("compromissos").select("*");
  if (mesRef) compQuery = compQuery.eq("mes_ref", mesRef);

  let dispQuery = supabase.from("disponibilidades").select("*");
  if (mesRef) {
    dispQuery = dispQuery.eq("mes_ref", mesRef);
  } else {
    dispQuery = dispQuery.is("mes_ref", null);
  }

  // 🔥 busca simultânea — economiza 1 round-trip completo
  let comps, data;
  try {
    const [resComps, resDisp] = await Promise.all([compQuery, dispQuery]);
    comps = resComps.data;
    data  = resDisp.data;
    if (resDisp.error) throw resDisp.error;
  } catch (err) {
    console.error(err);
    if (container) container.innerHTML = `<p style="color:#c0392b;text-align:center;padding:20px;">Erro ao carregar. Tente novamente.</p>`;
    return;
  }

  compromissosGlobais = comps || [];
  respostasGlobais = data || [];

  popularFiltroEventos(compromissosGlobais);
  renderizarRespostas(data);
}

// 🔥 usa os dados já buscados em carregarRespostas — sem nova query ao banco
function popularFiltroEventos(compromissos) {

  const select = document.getElementById("filtroEvento");
  if (!select) return;

  const eventosUnicos = [...new Set((compromissos || []).map(item => item.nome))].sort();

  select.innerHTML = `<option value="todos">Todos</option>`;

  eventosUnicos.forEach(evento => {
    const option = document.createElement("option");
    option.value = evento;
    option.textContent = evento;
    select.appendChild(option);
  });
}

function aplicarBusca() {

  const nomeBusca = normalizar(document.getElementById("buscaNome")?.value || "");
  const filtroMinisterio = document.getElementById("filtroMinisterio")?.value;
  const filtroEvento = document.getElementById("filtroEvento")?.value;

  let filtrado = respostasGlobais.filter(pessoa => {

    const nomeOk = normalizar(pessoa.nome_pessoa).includes(nomeBusca);

    const ministerioOk =
      filtroMinisterio === "todos" ||
      pessoa.ministerio === filtroMinisterio;

    const eventoOk =
      filtroEvento === "todos" ||
      pessoa.evento === filtroEvento;

    return nomeOk && ministerioOk && eventoOk;
  });

  renderizarRespostas(filtrado);
}

async function renderizarRespostas(respostasFiltradas) {

  const container = document.getElementById("lista-respostas");
  if (!container) return;

  container.innerHTML = "";

  const compromissos = compromissosGlobais;

  let respostas;
  if (respostasFiltradas !== undefined) {
    respostas = respostasFiltradas;
  } else {
    const { data } = await supabase.from("disponibilidades").select("*");
    respostas = data;
  }

  // 🔥 lista de pessoas únicas
  const pessoas = [...new Set(respostas.map(r => r.nome_pessoa))];

  let agrupado = {};

  // 🔥 pega o filtro de evento atual para limitar os grupos exibidos
  const filtroEvento = document.getElementById("filtroEvento")?.value || "todos";
  const compromissosFiltrados = filtroEvento === "todos"
    ? compromissos
    : compromissos.filter(comp => comp.nome === filtroEvento);

  compromissosFiltrados.forEach(comp => {
    const chave = `${comp.nome}|||${comp.turno}`;
    agrupado[chave] = [];
  });

  pessoas.forEach(pessoa => {

    const dadosPessoa = respostas.filter(r => r.nome_pessoa === pessoa);
    const ministerio = dadosPessoa[0]?.ministerio;

    compromissosFiltrados.forEach(comp => {

      const chave = `${comp.nome}|||${comp.turno}`;

      const marcou = dadosPessoa.find(r =>
        r.evento === comp.nome &&
        r.turno === comp.turno
      );

      if (ministerio === "Música Geral") {
        // 👉 marcou = NÃO pode
        if (!marcou) {
          agrupado[chave].push({
  nome: pessoa,
  ministerio: dadosPessoa[0]?.ministerio,
  tipo: dadosPessoa[0]?.tipo,
  instrumento: dadosPessoa[0]?.instrumento
});
        }
      } else {
        // 👉 marcou = PODE
        if (marcou) {
          agrupado[chave].push({
  nome: pessoa,
  ministerio: dadosPessoa[0]?.ministerio,
  tipo: dadosPessoa[0]?.tipo,
  instrumento: dadosPessoa[0]?.instrumento
});
        }
      }

    });

  });

  // 🔥 renderização
  Object.keys(agrupado).forEach(chave => {

    const [evento, turno] = chave.split("|||");

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo-evento";

    const titulo = document.createElement("h3");
    titulo.innerText = `${evento} - ${turno}`;

    const lista = document.createElement("div");
    lista.className = "lista-pessoas";

    agrupado[chave].forEach(pessoa => {

      const item = document.createElement("div");
      item.className = "item-pessoa";
      item.dataset.nome = pessoa.nome;
      item.dataset.ministerio = pessoa.ministerio;

      item.innerHTML = `
        <span class="badge-excluir">✕</span>
        <strong>${pessoa.nome}</strong><br>
        <small>${pessoa.ministerio}</small><br>
        <small>${pessoa.tipo === "toca" ? "Toca" : pessoa.tipo === "toca_canta" ? "Toca e Canta" : pessoa.tipo === "canta" ? "Canta" : ""} ${pessoa.instrumento ? "- " + pessoa.instrumento : ""}</small>
      `;

      item.onclick = () => item.classList.toggle("selecionado");

      lista.appendChild(item);
    });

    divGrupo.appendChild(titulo);
    divGrupo.appendChild(lista);
    container.appendChild(divGrupo);
  });
}
//////////////////////////////////////////////////////
// EXCLUIR DISPONIBILIDADES
//////////////////////////////////////////////////////

async function excluirSelecionadosDisp() {
  const selecionados = document.querySelectorAll(".item-pessoa.selecionado");

  if (selecionados.length === 0) {
    alert("Clique em uma ou mais pessoas para selecioná-las antes de excluir.");
    return;
  }

  const nomes = [...new Set(Array.from(selecionados).map(el => el.dataset.nome))];
  const confirmar = confirm(`Excluir respostas de ${nomes.length} pessoa(s)?\n\n${nomes.join(", ")}`);
  if (!confirmar) return;

  for (const nome of nomes) {
    await supabase.from("disponibilidades").delete().eq("nome_pessoa", nome);
  }

  carregarRespostas();
}

async function resetarTodasDisponibilidades() {
  const confirmar = confirm("⚠️ Isso vai apagar TODAS as disponibilidades de todos os membros.\n\nTem certeza?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("disponibilidades")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) { alert("Erro ao resetar."); return; }

  alert("Todas as disponibilidades foram apagadas.");
  carregarRespostas();
}

function mostrarPopup() {
  document.getElementById("popup-sucesso").style.display = "flex";
}

function fecharPopup() {
  window.location.href = "identificacao.html";
}
//////////////////////////////////////////////////////
// POPUP DE CONFIRMAÇÃO
//////////////////////////////////////////////////////

let resolverConfirmacao;

function abrirPopupConfirmacao() {
  document.getElementById("popup-confirmacao").style.display = "flex";

  return new Promise((resolve) => {
    resolverConfirmacao = resolve;
  });
}

function confirmarAtualizacao() {
  document.getElementById("popup-confirmacao").style.display = "none";
  resolverConfirmacao(true);
}

function cancelarAtualizacao() {
  document.getElementById("popup-confirmacao").style.display = "none";
  resolverConfirmacao(false);
}

//////////////////////////////////////////////////////
// POPUP JUSTIFICATIVA POR DATA
//////////////////////////////////////////////////////

let resolverJustificativa;

function abrirPopupJustificativa(selecionados) {
  const container = document.getElementById("lista-justificativas");
  container.innerHTML = "";

  selecionados.forEach((btn) => {
    const partes = btn.dataset.valor.split("|");

    const wrapper = document.createElement("div");
    wrapper.className = "justificativa-item";

    const label = document.createElement("p");
    label.innerText = `${partes[0]} - ${partes[1]}`;

    const input = document.createElement("textarea");
    input.placeholder = "Digite o motivo...";

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });

  document.getElementById("popup-justificativa").style.display = "flex";

  return new Promise((resolve) => {
    resolverJustificativa = resolve;
  });
}

function confirmarJustificativa() {
  const inputs = document.querySelectorAll("#lista-justificativas textarea");

  let justificativas = [];

  for (let input of inputs) {
    if (!input.value) {
      alert("Preencha todas as justificativas.");
      return;
    }

    justificativas.push(input.value);
  }

  document.getElementById("popup-justificativa").style.display = "none";
  resolverJustificativa(justificativas);
}
function cancelarJustificativa() {
  document.getElementById("popup-justificativa").style.display = "none";
  resolverJustificativa(null);
}
async function atualizarBotaoRespostas() {

  const botao = document.getElementById("btn-respostas");

  const { data, error } = await supabase
    .from('configuracoes')
    .select('respostas_ativas')
    .eq('id', 1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  if (data.respostas_ativas) {

    botao.innerHTML = "🟢 Respostas ATIVADAS";
    botao.style.background = "#27ae60";

  } else {

    botao.innerHTML = "🔴 Respostas DESATIVADAS";
    botao.style.background = "#c0392b";

  }

}

async function toggleRespostas() {

  const { data, error } = await supabase
    .from('configuracoes')
    .select('respostas_ativas')
    .eq('id', 1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const novoValor = !data.respostas_ativas;

  const { error: updateError } = await supabase
    .from('configuracoes')
    .update({
      respostas_ativas: novoValor
    })
    .eq('id', 1);

  if (updateError) {
    console.error(updateError);
    return;
  }

  atualizarBotaoRespostas();

}
async function verificarStatusRespostas() {

  const { data, error } = await supabase
    .from('configuracoes')
    .select('respostas_ativas')
    .eq('id', 1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  if (!data.respostas_ativas) {

    document.body.innerHTML = `
      <div style="
        height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        flex-direction:column;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:20px;
        background:#f4f6f9;
      ">
        <h1 style="
          color:#c0392b;
          margin-bottom:12px;
        ">
          ⛔ Respostas Encerradas
        </h1>

        <p style="
          color:#555;
          font-size:16px;
          max-width:400px;
          line-height:1.5;
        ">
          O período para envio de disponibilidades foi encerrado.
        </p>
      </div>
    `;

  }

}
function abrirPopupPush() {

  const jaFechou = localStorage.getItem("popupPushFechado");

  if (jaFechou) return;

  const popup = document.getElementById("popup-notificacao");

  if (popup) {
    popup.style.display = "flex";
  }

}

function fecharPopupPush() {

  localStorage.setItem("popupPushFechado", "true");

  const popup = document.getElementById("popup-notificacao");

  if (popup) {
    popup.style.display = "none";
  }

}

async function ativarPush() {

  try {

    await OneSignal.showSlidedownPrompt();

    localStorage.setItem("popupPushFechado", "true");

    fecharPopupPush();

  } catch (e) {

    console.error(e);

  }

}

window.addEventListener("load", () => {

  setTimeout(() => {

    abrirPopupPush();

  }, 2500);

});