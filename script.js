// Configurações de Preço
const TAXA_MINIMA = 5.00;
const VALOR_POR_KM = 1.90;

function calcularPreco(distanciaKm) {
    // Cálculo base
    let calculo = distanciaKm * VALOR_POR_KM;
    
    // Aplicação da taxa mínima
    // Se o valor por KM for menor que 5,00, prevalece os 5,00.
    let valorFinal = Math.max(TAXA_MINIMA, calculo);
    
    return valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Exemplo 1: 2km -> (2 * 1.90 = 3.80) -> Resultado: R$ 5,00 (Taxa Mínima)
// Exemplo 2: 10km -> (10 * 1.90 = 19.00) -> Resultado: R$ 19,00
