// Constantes baseadas no seu script oficial
const TAXA_MINIMA = 5.00; // [cite: 1]
const VALOR_POR_KM = 2.00; // [cite: 1]

async function buscarRota() {
    const dest = document.getElementById('destino').value;
    if(!dest) return alert("Por favor, digite o endereço de destino.");
    
    try {
        // Agora solicitamos detalhes do endereço (addressdetails=1) para pegar o bairro
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(dest + " São Paulo")}`);
        const data = await resp.json();
        if(data.length > 0) {
    // Extrai o bairro da resposta do mapa
    const info = data[0].address;
    const bairroDetectado = info.suburb || info.neighbourhood || info.village || "Não identificado";
    
    // Escreve no campo que criamos acima
    document.getElementById('bairro_automatico').value = bairroDetectado.toUpperCase();
    
    control.setWaypoints([ORIGEM_FIXA, L.latLng(data[0].lat, data[0].lon)]);
}
        if(data.length > 0) {
            // Extrai o bairro (suburb) ou vizinhança do resultado da API
            const infoEndereco = data[0].address;
            const bairro = infoEndereco.suburb || infoEndereco.neighbourhood || infoEndereco.city_district || "Bairro não identificado";
            
            // Preenche o campo de bairro automaticamente
            document.getElementById('bairro_automatico').value = bairro.toUpperCase();
            
            // Desenha a rota no mapa
            control.setWaypoints([ORIGEM_FIXA, L.latLng(data[0].lat, data[0].lon)]);
        } else { 
            alert("Endereço não localizado no mapa."); 
        }
    } catch (e) { 
        alert("Erro ao buscar rota."); 
    }
}

control.on('routesfound', function(e) {
    const km = e.routes[0].summary.totalDistance / 1000; // [cite: 67]
    const calculoBase = km * VALOR_POR_KM; // [cite: 4]
    let valorFinal = Math.max(TAXA_MINIMA, calculoBase); // [cite: 5]
    
    // Atualiza os dados na tela [cite: 7, 8]
    document.getElementById('distancia').innerText = km.toFixed(2);
    document.getElementById('valor').innerText = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // EXIBE A SEÇÃO DE RESULTADOS 
    document.querySelector('.resumo').style.display = 'block';
    
    // GESTÃO DO AVISO DE TAXA MÍNIMA [cite: 9, 10]
    const elementoAviso = document.getElementById('aviso-taxa');
    if (calculoBase < TAXA_MINIMA) {
        elementoAviso.innerHTML = "⚠️ TAXA MÍNIMA APLICADA✅";
        elementoAviso.style.display = 'block';
    } else {
        elementoAviso.style.display = 'none';
    }
    
    rotaCalculada = true; 
    map.fitBounds(L.latLngBounds([ORIGEM_FIXA, e.routes[0].inputWaypoints[1].latLng]), {padding: [30, 30]}); // [cite: 68]
});
