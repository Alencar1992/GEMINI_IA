console.log("Script carregado com sucesso!");

// Botão de Teste Simples
function iniciarVerificacao() {
    alert("O script está funcionando! O problema era o carregamento.");
    console.log("Botão Calcular funcionando.");
}

// Outras funções mínimas para não quebrar o HTML
function selecionarBusca(tipo) { console.log("Seleção de busca: " + tipo); }
function limpar() { location.reload(); }
function selecionarTipo(tipo) { console.log("Tipo selecionado: " + tipo); }
