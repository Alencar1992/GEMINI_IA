// Configurações de Preço
const TAXA_MINIMA = 5.00;
const VALOR_POR_KM = 2.00;

function calcularFrete() {
    // 1. Pega a distância (supondo que seu input tenha o id 'distancia')
    const distanciaInput = document.getElementById('distancia').value;
    const distanciaKm = parseFloat(distanciaInput);

    if (isNaN(distanciaKm) || distanciaKm <= 0) {
        alert("Por favor, insira uma distância válida.");
        return;
    }

    // 2. Lógica de cálculo
    let calculoBase = distanciaKm * VALOR_POR_KM;
    let usouTaxaMinima = calculoBase < TAXA_MINIMA;
    let valorFinal = Math.max(TAXA_MINIMA, calculoBase);

    // 3. Formatação
    const valorFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 4. ATUALIZAÇÃO DA TELA
    // Exibe a distância e o valor
    document.getElementById('res-distancia').innerText = distanciaKm + " km";
    document.getElementById('res-valor').innerText = valorFormatado;

    // Mostra ou esconde o aviso de Taxa Mínima
    const avisoElemento = document.getElementById('aviso-taxa');
    if (usouTaxaMinima) {
        avisoElemento.innerHTML = `⚠️ <strong>Aviso:</strong> Foi aplicada a taxa mínima de ${TAXA_MINIMA.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por ser um trajeto curto.`;
        avisoElemento.style.display = "block";
    } else {
        avisoElemento.style.display = "none";
    }

    // 5. MOSTRAR O CONTAINER (Sua segunda solicitação)
    document.getElementById('resultado-container').style.display = "block";
}
