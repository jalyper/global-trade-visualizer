// Global Trade Visualization JavaScript
// This script creates interactive visualizations of global trade data with advanced economic analysis

// Main visualization code
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, starting visualization...");
    
    // Load the data files
    Promise.all([
        d3.csv('data/processed/trade_flows_raw.csv'),
        d3.csv('data/processed/trade_summary.csv'),
        d3.json('data/processed/trade_matrix.json'),
        d3.json('data/processed/trade_network.json'),
        d3.csv('data/processed/yearly_trade_summary.csv'),
        d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'),
        d3.csv('data/processed/sector_trade_flows.csv')
    ]).then(function(files) {
        console.log("All data files loaded successfully");
        const tradeFlowsData = files[0];
        const tradeSummaryData = files[1];
        const tradeMatrixData = files[2];
        const tradeNetworkData = files[3];
        const yearlyTradeData = files[4];
        const worldGeoData = files[5];
        const sectorTradeData = files[6];
        
        console.log("Trade summary data count:", tradeSummaryData.length);
        console.log("Trade network nodes:", tradeNetworkData.nodes.length);
        console.log("Trade matrix countries:", tradeMatrixData.countries.length);
        console.log("Yearly trade data records:", yearlyTradeData ? yearlyTradeData.length : "Not available");
        console.log("Sector trade data records:", sectorTradeData ? sectorTradeData.length : "Not available");
        
        // Calculate key economic indicators
        calculateEconomicIndicators(tradeSummaryData, tradeMatrixData);
        
        // Initialize visualizations
        try {
            createNetworkGraph(tradeNetworkData);
            createChordDiagram(tradeMatrixData);
            createTradeBalanceChart(tradeSummaryData);
            createTopExportersChart(tradeSummaryData);
            createTopImportersChart(tradeSummaryData);
            createHistoricalTrendChart(yearlyTradeData || tradeFlowsData, tradeSummaryData);
            createGeographicMap(tradeFlowsData, tradeSummaryData, worldGeoData);
            createSectorNetworkGraph(sectorTradeData || tradeFlowsData, 'agriculture');
            console.log("All visualizations created successfully");
        } catch (error) {
            console.error("Error creating visualizations:", error);
            document.querySelectorAll('.chart-container').forEach(container => {
                container.innerHTML = '<div class="alert alert-danger">Error creating visualization: ' + error.message + '</div>';
            });
        }
        
        // Set up tab switching behavior
        const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', function(event) {
                // Redraw charts when tab is shown to ensure proper sizing
                if (event.target.id === 'network-tab') {
                    // Redraw network graph
                    d3.select('#network-chart').select('svg').remove();
                    createNetworkGraph(tradeNetworkData);
                } else if (event.target.id === 'chord-tab') {
                    // Redraw chord diagram
                    d3.select('#chord-chart').select('svg').remove();
                    createChordDiagram(tradeMatrixData);
                } else if (event.target.id === 'balance-tab') {
                    // Redraw trade balance chart
                    d3.select('#bar-chart').select('svg').remove();
                    createTradeBalanceChart(tradeSummaryData);
                } else if (event.target.id === 'history-tab') {
                    // Redraw historical trend chart
                    d3.select('#history-chart').select('svg').remove();
                    createHistoricalTrendChart(yearlyTradeData || tradeFlowsData, tradeSummaryData);
                } else if (event.target.id === 'map-tab') {
                    // Redraw geographic map
                    d3.select('#map-chart').select('svg').remove();
                    createGeographicMap(tradeFlowsData, tradeSummaryData, worldGeoData);
                } else if (event.target.id === 'sectors-tab') {
                    // Find the active sector button
                    const activeSectorBtn = document.querySelector('#sectors-panel .btn-group button.active');
                    const sectorId = activeSectorBtn ? activeSectorBtn.id.replace('sector-', '') : 'agriculture';
                    
                    // Redraw sector network
                    d3.select('#sector-chart').select('svg').remove();
                    createSectorNetworkGraph(sectorTradeData || tradeFlowsData, sectorId);
                }
            });
        });
        
        // Set up sector button event listeners
        document.querySelectorAll('#sectors-panel .btn-group button').forEach(button => {
            button.addEventListener('click', function() {
                // Update active button
                document.querySelectorAll('#sectors-panel .btn-group button').forEach(btn => {
                    btn.classList.remove('active');
                });
                this.classList.add('active');
                
                // Get sector from button ID
                const sectorId = this.id.replace('sector-', '');
                
                // Redraw sector network
                d3.select('#sector-chart').select('svg').remove();
                createSectorNetworkGraph(sectorTradeData || tradeFlowsData, sectorId);
            });
        });
        
        // Set up show all countries checkbox
        document.getElementById('sector-show-all').addEventListener('change', function() {
            // Find the active sector button
            const activeSectorBtn = document.querySelector('#sectors-panel .btn-group button.active');
            const sectorId = activeSectorBtn ? activeSectorBtn.id.replace('sector-', '') : 'agriculture';
            
            // Redraw sector network
            d3.select('#sector-chart').select('svg').remove();
            createSectorNetworkGraph(sectorTradeData || tradeFlowsData, sectorId);
        });
    }).catch(function(error) {
        console.error('Error loading data files:', error);
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = '<div class="alert alert-danger">Error loading data. Please check the console for details.</div>';
        });
    });
});

// Calculate economic indicators for deeper analysis
function calculateEconomicIndicators(tradeSummaryData, tradeMatrixData) {
    // Add trade openness (trade as % of estimated GDP - using a proxy calculation)
    tradeSummaryData.forEach(country => {
        // Set GDP approximations based on known data (in trillions USD)
        // In a real implementation, this would come from actual GDP data
        const gdpEstimates = {
            'United States': 23.0,
            'China': 17.7, 
            'Japan': 5.0,
            'Germany': 4.2,
            'United Kingdom': 3.1,
            'India': 3.2,
            'France': 2.9,
            'Italy': 2.1,
            'Canada': 1.9,
            'Rep. of Korea': 1.8,
            'Australia': 1.5,
            'Brazil': 1.8,
            'Spain': 1.4,
            'Mexico': 1.3,
            'Netherlands': 1.0
        };
        
        const gdp = gdpEstimates[country.country] || 1.0; // Fallback if country not found
        const totalTrade = Number(country.exports) + Number(country.imports);
        
        // Calculate trade metrics
        country.tradeOpenness = (totalTrade / (gdp * 1e12)) * 100; // Trade as % of GDP
        country.exportRatio = Number(country.exports) / totalTrade * 100; // Exports as % of total trade
        country.tradeBalance = Number(country.exports) - Number(country.imports);
        country.tradeBalanceRatio = country.tradeBalance / (gdp * 1e12) * 100; // Trade balance as % of GDP
    });
    
    // Calculate trade concentration (simplified Herfindahl-Hirschman Index)
    // For each country, analyze export and import concentration
    if (tradeMatrixData && tradeMatrixData.matrix) {
        const countries = tradeMatrixData.countries;
        const matrix = tradeMatrixData.matrix;
        
        // For each country, calculate HHI
        matrix.forEach((row, i) => {
            const countryName = countries[i];
            // Find the trade summary entry
            const countrySummary = tradeSummaryData.find(c => c.country === countryName);
            if (!countrySummary) return;
            
            // Calculate export concentration
            const totalExports = row.reduce((sum, val) => sum + val, 0);
            if (totalExports > 0) {
                // Calculate normalized HHI (0-1 scale)
                const exportHHI = row.reduce((sum, val) => {
                    const share = val / totalExports;
                    return sum + (share * share);
                }, 0);
                countrySummary.exportConcentration = exportHHI;
            }
            
            // Calculate import concentration (using column data)
            const importData = matrix.map(r => r[i]);
            const totalImports = importData.reduce((sum, val) => sum + val, 0);
            if (totalImports > 0) {
                const importHHI = importData.reduce((sum, val) => {
                    const share = val / totalImports;
                    return sum + (share * share);
                }, 0);
                countrySummary.importConcentration = importHHI;
            }
        });
    }
    
    // Sort by trade volume
    tradeSummaryData.sort((a, b) => {
        return (Number(b.exports) + Number(b.imports)) - (Number(a.exports) + Number(a.imports));
    });
    
    console.log("Economic indicators calculated", tradeSummaryData);
}

// Network Graph Visualization with Enhanced Economic Context
function createNetworkGraph(data) {
    console.log("Creating network graph...");
    const container = document.getElementById('network-chart');
    if (!container) {
        console.error("Network chart container not found");
        return;
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    
    // Filter links to only include those where both source and target are in the nodes list
    const nodeIds = new Set(data.nodes.map(node => node.id));
    console.log("Available node IDs:", Array.from(nodeIds));
    
    const filteredLinks = data.links.filter(link => {
        // Convert source/target to string if they're not already
        const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
        const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
        
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    console.log(`Filtered links from ${data.links.length} to ${filteredLinks.length}`);
    
    // Calculate stats for better scaling
    const values = filteredLinks.map(link => link.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    console.log(`Link values - min: ${minValue}, max: ${maxValue}`);
    
    // Group nodes by region for economic analysis
    const regions = {
        'North America': ['USA', 'Canada', 'Mexico'],
        'Europe': ['Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands'],
        'Asia-Pacific': ['China', 'Japan', 'Rep. of Korea', 'Australia', 'India'],
        'South America': ['Brazil']
    };
    
    // Assign regions to nodes
    data.nodes.forEach(node => {
        for (const [region, countries] of Object.entries(regions)) {
            if (countries.includes(node.name)) {
                node.region = region;
                break;
            }
        }
        node.region = node.region || 'Other';
    });
    
    // Use the filtered links with region information
    const simulationData = {
        nodes: data.nodes,
        links: filteredLinks
    };
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Create a group for zoom/pan behavior
    const g = svg.append('g');
    
    // Color scale for nodes based on regions
    const regionColors = {
        'North America': '#1f77b4',
        'Europe': '#ff7f0e',
        'Asia-Pacific': '#2ca02c',
        'South America': '#d62728',
        'Other': '#9467bd'
    };
    
    // Create a force simulation
    const simulation = d3.forceSimulation(simulationData.nodes)
        .force('link', d3.forceLink(simulationData.links).id(d => d.id).distance(200))
        .force('charge', d3.forceManyBody().strength(-1000))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60));
    
    // Create links with much thinner lines
    const link = g.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.4)
        .selectAll('line')
        .data(simulationData.links)
        .join('line')
        .attr('stroke-width', d => {
            // Calculate a more reasonable stroke width
            // Use a log scale to prevent extremely thick lines
            return Math.max(0.5, Math.min(3, Math.log10(d.value) / 5));
        });
    
    // Create nodes
    const node = g.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .selectAll('circle')
        .data(simulationData.nodes)
        .join('circle')
        .attr('r', 20)  // Larger nodes
        .attr('fill', d => regionColors[d.region])
        .call(drag(simulation));
    
    // Add labels to nodes
    const label = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(simulationData.nodes)
        .join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(d => d.name)  // Show country name instead of ID
        .attr('pointer-events', 'none');
    
    // Add tooltips with economic context
    node.append('title')
        .text(d => `${d.name} (${d.region})`);
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y - 25);  // Position labels above nodes
    });
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Zoom controls
    document.getElementById('network-zoom-in')?.addEventListener('click', () => {
        svg.transition().duration(500).call(zoom.scaleBy, 1.5);
    });
    
    document.getElementById('network-zoom-out')?.addEventListener('click', () => {
        svg.transition().duration(500).call(zoom.scaleBy, 0.75);
    });
    
    document.getElementById('network-reset')?.addEventListener('click', () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });
    
    // Toggle labels
    document.getElementById('show-labels')?.addEventListener('change', function() {
        if (this.checked) {
            label.style('display', 'block');
        } else {
            label.style('display', 'none');
        }
    });
    
    // Add a legend for regions
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 160}, 20)`);
        
    Object.entries(regionColors).forEach(([region, color], i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
            
        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', color);
            
        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12.5)
            .attr('font-size', '12px')
            .text(region);
    });
    
    // Drag behavior for nodes
    function drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
        
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    console.log("Network graph created successfully");
}

// Chord Diagram Visualization with Economic Context
function createChordDiagram(data) {
    console.log("Creating chord diagram...");
    const container = document.getElementById('chord-chart');
    if (!container) {
        console.error("Chord chart container not found");
        return;
    }
    
    console.log("Chord data format:", data);
    if (!data.countries || !data.matrix || data.countries.length === 0 || data.matrix.length === 0) {
        console.error("Invalid chord data format");
        container.innerHTML = '<div class="alert alert-danger">Invalid data format for chord diagram</div>';
        return;
    }
    
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 600;
    
    // Calculate trade imbalances and dependency metrics
    const tradeRelationships = [];
    for (let i = 0; i < data.countries.length; i++) {
        for (let j = 0; j < data.countries.length; j++) {
            if (i !== j) {
                const exports = data.matrix[i][j];
                const imports = data.matrix[j][i];
                
                if (exports > 0 || imports > 0) {
                    // Calculate bilateral metrics
                    const netBalance = exports - imports;
                    const totalTrade = exports + imports;
                    const imbalanceRatio = Math.abs(netBalance) / totalTrade;
                    
                    tradeRelationships.push({
                        source: i,
                        target: j,
                        sourceCountry: data.countries[i],
                        targetCountry: data.countries[j],
                        exports: exports,
                        imports: imports,
                        netBalance: netBalance,
                        imbalanceRatio: imbalanceRatio,
                        totalTrade: totalTrade
                    });
                }
            }
        }
    }
    
    // Sort to find largest relationships
    const sortedRelationships = [...tradeRelationships].sort((a, b) => b.totalTrade - a.totalTrade);
    const topRelationships = sortedRelationships.slice(0, 5);
    
    console.log("Top bilateral relationships:", topRelationships);
    
    // Ensure we have a minimum size and centered viewBox
    const minDimension = Math.max(300, Math.min(width, height));
    const outerRadius = (minDimension / 2) - 100; // Ensure adequate margin
    const innerRadius = outerRadius - 20;
    
    console.log(`Chord diagram dimensions: ${width}x${height}, outer radius: ${outerRadius}, inner radius: ${innerRadius}`);
    
    // Create SVG with appropriate viewBox
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Color scale based on trade balance
    const balanceColorScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range(['#dc3545', '#6c757d', '#28a745']);
        
    // Base color scale for countries
    const countryColors = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(data.countries);
    
    // Create chord layout
    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);
    
    // Create arc generator
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
    
    // Create ribbon generator
    const ribbon = d3.ribbon()
        .radius(innerRadius);
    
    try {
        // Process the chord data
        const chords = chord(data.matrix);
        
        // Create groups
        const group = svg.append('g')
            .selectAll('g')
            .data(chords.groups)
            .join('g');
        
        // Add arcs
        group.append('path')
            .attr('fill', d => countryColors(d.index))
            .attr('stroke', d => d3.rgb(countryColors(d.index)).darker())
            .attr('d', arc);
        
        // Add country labels
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '0.35em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius + 10})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .text(d => data.countries[d.index])
            .attr('font-size', '10px');  // Smaller font for better fit
        
        // Add detailed economic metrics below country names
        group.append('text')
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr('dy', '1.5em')
            .attr('transform', d => `
                rotate(${(d.angle * 180 / Math.PI - 90)})
                translate(${outerRadius + 10})
                ${d.angle > Math.PI ? 'rotate(180)' : ''}
            `)
            .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
            .text(d => {
                // Sum exports for this country
                const totalExports = data.matrix[d.index].reduce((sum, val) => sum + val, 0);
                return totalExports > 0 ? `$${d3.format('.1f')(totalExports / 1e12)}T` : '';
            })
            .attr('font-size', '8px')
            .attr('fill', '#666');
        
        // Add ribbons with economic context in tooltips
        svg.append('g')
            .attr('fill-opacity', 0.7)
            .selectAll('path')
            .data(chords)
            .join('path')
            .attr('d', ribbon)
            .attr('fill', d => {
                // Color based on trade balance
                const sourceExports = d.source.value;
                const targetExports = data.matrix[d.target.index][d.source.index];
                const tradeBalance = sourceExports - targetExports;
                const balanceRatio = tradeBalance / (sourceExports + targetExports);
                return balanceColorScale(balanceRatio);
            })
            .attr('stroke', d => {
                const sourceExports = d.source.value;
                const targetExports = data.matrix[d.target.index][d.source.index];
                const tradeBalance = sourceExports - targetExports;
                const balanceRatio = tradeBalance / (sourceExports + targetExports);
                return d3.rgb(balanceColorScale(balanceRatio)).darker();
            })
            .attr('stroke-width', d => {
                // Highlight top 5 trade relationships
                const sourceCountry = data.countries[d.source.index];
                const targetCountry = data.countries[d.target.index];
                const isTopRelationship = topRelationships.some(rel => 
                    (rel.sourceCountry === sourceCountry && rel.targetCountry === targetCountry) ||
                    (rel.sourceCountry === targetCountry && rel.targetCountry === sourceCountry)
                );
                return isTopRelationship ? 2 : 0.5;
            })
            .append('title')
            .text(d => {
                const sourceCountry = data.countries[d.source.index];
                const targetCountry = data.countries[d.target.index];
                const sourceExports = d.source.value;
                const targetExports = data.matrix[d.target.index][d.source.index];
                const bilateralTotal = sourceExports + targetExports;
                const tradeBalance = sourceExports - targetExports;
                const balanceRatio = tradeBalance / bilateralTotal;
                
                let balanceText = "";
                if (tradeBalance > 0) {
                    balanceText = `${sourceCountry} has a trade surplus of $${d3.format(',.2f')(tradeBalance / 1e9)}B`;
                } else if (tradeBalance < 0) {
                    balanceText = `${sourceCountry} has a trade deficit of $${d3.format(',.2f')(Math.abs(tradeBalance) / 1e9)}B`;
                } else {
                    balanceText = "Trade is perfectly balanced";
                }
                
                return `Bilateral Trade: ${sourceCountry} → ${targetCountry}
Exports: $${d3.format(',.2f')(sourceExports / 1e9)}B
Imports: $${d3.format(',.2f')(targetExports / 1e9)}B
Total bilateral trade: $${d3.format(',.2f')(bilateralTotal / 1e9)}B
${balanceText}
Imbalance ratio: ${d3.format('.1%')(Math.abs(balanceRatio))}`;
            });
            
        // Add trade balance color scale legend
        const legendWidth = 150;
        const legendHeight = 15;
        const legendX = -width/2 + 50;
        const legendY = height/2 - 80;
        
        const legendScale = d3.scaleLinear()
            .domain([-1, 0, 1])
            .range([0, legendWidth/2, legendWidth]);
            
        const legendAxis = d3.axisBottom(legendScale)
            .tickValues([-1, -0.5, 0, 0.5, 1])
            .tickFormat(d => {
                if (d === -1) return "100% Deficit";
                if (d === 0) return "Balanced";
                if (d === 1) return "100% Surplus";
                return Math.abs(d * 100) + "%";
            });
            
        const defs = svg.append("defs");
        
        const gradient = defs.append("linearGradient")
            .attr("id", "balance-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");
            
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", balanceColorScale(-1));
            
        gradient.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", balanceColorScale(0));
            
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", balanceColorScale(1));
            
        const legend = svg.append("g")
            .attr("transform", `translate(${legendX}, ${legendY})`);
            
        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#balance-gradient)");
            
        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(legendAxis)
            .select(".domain").remove();
            
        legend.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text("Bilateral Trade Balance");
            
        console.log("Chord diagram created successfully");
    } catch (error) {
        console.error("Error creating chord diagram:", error);
        container.innerHTML = '<div class="alert alert-danger">Error creating chord diagram: ' + error.message + '</div>';
    }
    
    // Add filter control
    document.getElementById('chord-filter')?.addEventListener('change', function() {
        try {
            svg.selectAll('*').remove();
            if (this.value === 'top5') {
                // Calculate total trade for each country
                const totalTrade = data.matrix.map((row, i) => {
                    return row.reduce((sum, val) => sum + val, 0);
                });
                
                // Get indices of top 5 countries by total trade
                const topIndices = Array.from(Array(data.countries.length).keys())
                    .sort((a, b) => totalTrade[b] - totalTrade[a])
                    .slice(0, 5);
                
                // Filter countries and matrix
                const filteredData = {
                    countries: topIndices.map(i => data.countries[i]),
                    matrix: topIndices.map(i => {
                        return topIndices.map(j => data.matrix[i][j]);
                    })
                };
                
                console.log("Filtered to top 5 countries:", filteredData.countries);
                
                // Recreate with filtered data
                createChordDiagram(filteredData);
            } else {
                // Recreate with all data
                createChordDiagram(data);
            }
        } catch (error) {
            console.error("Error applying filter:", error);
            container.innerHTML = '<div class="alert alert-danger">Error applying filter: ' + error.message + '</div>';
        }
    });
}

// Trade Balance Chart with Economic Context
function createTradeBalanceChart(data) {
    const container = document.getElementById('bar-chart');
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    const margin = {top: 30, right: 30, bottom: 90, left: 80};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Prepare data
    data.forEach(d => {
        d.exports = +d.exports;
        d.imports = +d.imports;
        d.balance = +d.balance;
    });
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([0, innerWidth])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([
            d3.min(data, d => Math.min(-d.imports, d.balance)) * 1.1,
            d3.max(data, d => Math.max(d.exports, d.balance)) * 1.1
        ])
        .range([innerHeight, 0]);
    
    // Add axes
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickFormat(d => `$${d3.format('.1s')(d)}`));
    
    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat('')
        )
        .attr('stroke-opacity', 0.1);
    
    // Add zero line
    g.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('y1', y(0))
        .attr('x2', innerWidth)
        .attr('y2', y(0))
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4');
    
    // Create export bars
    g.selectAll('.export-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'export-bar')
        .attr('x', d => x(d.country))
        .attr('y', d => y(d.exports))
        .attr('width', x.bandwidth() / 2)
        .attr('height', d => innerHeight - y(d.exports))
        .attr('fill', '#28a745')
        .append('title')
        .text(d => {
            return `${d.country} Exports:
$${d3.format(',.2f')(d.exports / 1e12)}T
${d.exportRatio ? d3.format(',.1f')(d.exportRatio) + '% of total trade' : ''}
${d.tradeOpenness ? 'Trade openness: ' + d3.format(',.1f')(d.tradeOpenness) + '% of GDP' : ''}
${d.exportConcentration ? 'Export HHI: ' + d3.format(',.3f')(d.exportConcentration) : ''}`;
        });
    
    // Create import bars
    g.selectAll('.import-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'import-bar')
        .attr('x', d => x(d.country) + x.bandwidth() / 2)
        .attr('y', d => y(0))
        .attr('width', x.bandwidth() / 2)
        .attr('height', d => y(0) - y(d.imports))
        .attr('fill', '#dc3545')
        .append('title')
        .text(d => {
            return `${d.country} Imports:
$${d3.format(',.2f')(d.imports / 1e12)}T
${d.importConcentration ? 'Import HHI: ' + d3.format(',.3f')(d.importConcentration) : ''}`;
        });
    
    // Create balance line with context
    g.selectAll('.balance-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'balance-point')
        .attr('cx', d => x(d.country) + x.bandwidth() / 2)
        .attr('cy', d => y(d.balance))
        .attr('r', 5)
        .attr('fill', '#007bff')
        .append('title')
        .text(d => {
            const surplusOrDeficit = d.balance > 0 ? 'Surplus' : 'Deficit';
            return `${d.country} Trade ${surplusOrDeficit}:
$${d3.format(',.2f')(Math.abs(d.balance) / 1e12)}T
${d.tradeBalanceRatio ? d3.format(',.1f')(d.tradeBalanceRatio) + '% of GDP' : ''}`;
        });
    
    // Add trade balance % of GDP markers
    if (data.some(d => d.tradeBalanceRatio)) {
        const gdpLine = g.append('g')
            .selectAll('.gdp-marker')
            .data(data)
            .enter()
            .append('line')
            .attr('class', 'gdp-marker')
            .attr('x1', d => x(d.country) + x.bandwidth() / 4)
            .attr('y1', d => y(d.balance))
            .attr('x2', d => x(d.country) + x.bandwidth() * 3/4)
            .attr('y2', d => y(d.balance))
            .attr('stroke', '#ff9800')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '2,2')
            .attr('opacity', 0.7)
            .attr('display', d => d.tradeBalanceRatio ? 'block' : 'none');
    }
    
    // Add labels
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -60)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .text('Trade Volume (USD)');
    
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Countries');
    
    // Add legend
    const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${innerWidth - 160}, 0)`);
    
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', '#28a745');
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 12.5)
        .text('Exports');
    
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 25)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', '#dc3545');
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 37.5)
        .text('Imports');
    
    legend.append('circle')
        .attr('cx', 7.5)
        .attr('cy', 57.5)
        .attr('r', 5)
        .attr('fill', '#007bff');
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 62.5)
        .text('Balance');
        
    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 75)
        .attr('x2', 15)
        .attr('y2', 75)
        .attr('stroke', '#ff9800')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '2,2');
        
    legend.append('text')
        .attr('x', 20)
        .attr('y', 78)
        .text('% of GDP');
    
    // Add economic insight annotation
    const annotations = g.append('g')
        .attr('class', 'annotations');
        
    // Find country with highest trade balance
    const highestSurplus = [...data].sort((a, b) => b.tradeBalanceRatio - a.tradeBalanceRatio)[0];
    const lowestDeficit = [...data].sort((a, b) => a.tradeBalanceRatio - b.tradeBalanceRatio)[0];
    
    if (highestSurplus && highestSurplus.tradeBalanceRatio > 0) {
        annotations.append('path')
            .attr('d', `M${x(highestSurplus.country) + x.bandwidth()/2},${y(highestSurplus.balance) - 10}L${x(highestSurplus.country) + x.bandwidth()/2},${y(highestSurplus.balance) - 40}`)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .attr('marker-end', 'url(#arrow)');
            
        annotations.append('text')
            .attr('x', x(highestSurplus.country) + x.bandwidth()/2)
            .attr('y', y(highestSurplus.balance) - 45)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(`Highest surplus: ${d3.format('.1f')(highestSurplus.tradeBalanceRatio)}% of GDP`);
    }
    
    if (lowestDeficit && lowestDeficit.tradeBalanceRatio < 0) {
        annotations.append('path')
            .attr('d', `M${x(lowestDeficit.country) + x.bandwidth()/2},${y(lowestDeficit.balance) + 10}L${x(lowestDeficit.country) + x.bandwidth()/2},${y(lowestDeficit.balance) + 40}`)
            .attr('stroke', '#333')
            .attr('stroke-width', 1)
            .attr('marker-end', 'url(#arrow)');
            
        annotations.append('text')
            .attr('x', x(lowestDeficit.country) + x.bandwidth()/2)
            .attr('y', y(lowestDeficit.balance) + 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(`Largest deficit: ${d3.format('.1f')(Math.abs(lowestDeficit.tradeBalanceRatio))}% of GDP`);
    }
    
    // Define arrow marker for annotations
    svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#333');
    
    // Sorting controls
    document.getElementById('sort-name')?.addEventListener('click', function() {
        data.sort((a, b) => d3.ascending(a.country, b.country));
        updateChart();
    });
    
    document.getElementById('sort-exports')?.addEventListener('click', function() {
        data.sort((a, b) => d3.descending(a.exports, b.exports));
        updateChart();
    });
    
    document.getElementById('sort-imports')?.addEventListener('click', function() {
        data.sort((a, b) => d3.descending(a.imports, b.imports));
        updateChart();
    });
    
    document.getElementById('sort-balance')?.addEventListener('click', function() {
        data.sort((a, b) => d3.descending(a.balance, b.balance));
        updateChart();
    });
    
    function updateChart() {
        // Update x domain
        x.domain(data.map(d => d.country));
        
        // Update with transition
        const t = svg.transition().duration(750);
        
        // Update x-axis
        g.select('.x-axis')
            .transition(t)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em');
        
        // Update export bars
        g.selectAll('.export-bar')
            .data(data)
            .transition(t)
            .attr('x', d => x(d.country))
            .attr('y', d => y(d.exports))
            .attr('height', d => innerHeight - y(d.exports));
        
        // Update import bars
        g.selectAll('.import-bar')
            .data(data)
            .transition(t)
            .attr('x', d => x(d.country) + x.bandwidth() / 2)
            .attr('height', d => y(0) - y(d.imports));
        
        // Update balance points
        g.selectAll('.balance-point')
            .data(data)
            .transition(t)
            .attr('cx', d => x(d.country) + x.bandwidth() / 2)
            .attr('cy', d => y(d.balance));
            
        // Update GDP markers
        g.selectAll('.gdp-marker')
            .data(data)
            .transition(t)
            .attr('x1', d => x(d.country) + x.bandwidth() / 4)
            .attr('y1', d => y(d.balance))
            .attr('x2', d => x(d.country) + x.bandwidth() * 3/4)
            .attr('y2', d => y(d.balance));
    }
}

// Top Exporters Chart
function createTopExportersChart(data) {
    const container = document.getElementById('top-exporters-chart');
    const width = container.clientWidth;
    const height = 300;
    const margin = {top: 20, right: 20, bottom: 50, left: 80};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Sort and slice data to get top 10 exporters
    const topExporters = [...data]
        .sort((a, b) => d3.descending(+a.exports, +b.exports))
        .slice(0, 10);
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(topExporters, d => +d.exports) * 1.1])
        .range([0, innerWidth]);
    
    const y = d3.scaleBand()
        .domain(topExporters.map(d => d.country))
        .range([0, innerHeight])
        .padding(0.2);
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => `$${d3.format('.1s')(d)}`));
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisBottom(x)
            .tickSize(innerHeight)
            .tickFormat('')
        )
        .attr('stroke-opacity', 0.1);
    
    // Add bars
    g.selectAll('.bar')
        .data(topExporters)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.country))
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(+d.exports))
        .attr('fill', '#28a745')
        .append('title')
        .text(d => `${d.country}: $${d3.format(',')(d.exports)}`);
    
    // Add value labels
    g.selectAll('.label')
        .data(topExporters)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('y', d => y(d.country) + y.bandwidth() / 2)
        .attr('x', d => x(+d.exports) + 5)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(d => `$${d3.format('.1s')(d.exports)}`);
    
    // Add labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Export Value (USD)');
}

// Top Importers Chart
function createTopImportersChart(data) {
    const container = document.getElementById('top-importers-chart');
    const width = container.clientWidth;
    const height = 300;
    const margin = {top: 20, right: 20, bottom: 50, left: 80};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Sort and slice data to get top 10 importers
    const topImporters = [...data]
        .sort((a, b) => d3.descending(+a.imports, +b.imports))
        .slice(0, 10);
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create chart group
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(topImporters, d => +d.imports) * 1.1])
        .range([0, innerWidth]);
    
    const y = d3.scaleBand()
        .domain(topImporters.map(d => d.country))
        .range([0, innerHeight])
        .padding(0.2);
    
    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => `$${d3.format('.1s')(d)}`));
    
    g.append('g')
        .call(d3.axisLeft(y));
    
    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisBottom(x)
            .tickSize(innerHeight)
            .tickFormat('')
        )
        .attr('stroke-opacity', 0.1);
    
    // Add bars
    g.selectAll('.bar')
        .data(topImporters)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('y', d => y(d.country))
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', d => x(+d.imports))
        .attr('fill', '#dc3545')
        .append('title')
        .text(d => `${d.country}: $${d3.format(',')(d.imports)}`);
    
    // Add value labels
    g.selectAll('.label')
        .data(topImporters)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('y', d => y(d.country) + y.bandwidth() / 2)
        .attr('x', d => x(+d.imports) + 5)
        .attr('dy', '0.35em')
        .attr('font-size', '12px')
        .text(d => `$${d3.format('.1s')(d.imports)}`);
    
    // Add labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Import Value (USD)');
}

// Historical Trade Trends Chart to track trading power over time
function createHistoricalTrendChart(tradeData, tradeSummaryData) {
    console.log("Creating historical trend chart...");
    const container = document.getElementById('history-chart');
    if (!container) {
        console.error("History chart container not found");
        return;
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    const margin = {top: 40, right: 120, bottom: 50, left: 80};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Process the data to get yearly trends
    // Check if we have yearly summary data or need to process raw trade flows
    let chartData = [];
    const years = Array.from(new Set(tradeData.map(d => d.year))).sort();
    
    // Check if this is yearly summary data (has total_trade field)
    const isYearlySummary = tradeData.length > 0 && 'total_trade' in tradeData[0];
    
    if (isYearlySummary) {
        console.log("Using yearly summary data");
        chartData = tradeData.map(d => {
            // Set GDP approximations based on known data (in trillions USD)
            const gdpEstimates = {
                'United States': 23.0,
                'China': 17.7, 
                'Japan': 5.0,
                'Germany': 4.2,
                'United Kingdom': 3.1,
                'India': 3.2,
                'France': 2.9,
                'Italy': 2.1,
                'Canada': 1.9,
                'Rep. of Korea': 1.8,
                'Australia': 1.5,
                'Brazil': 1.8,
                'Spain': 1.4,
                'Mexico': 1.3,
                'Netherlands': 1.0
            };
            
            // Match country names that might differ
            const gdpCountry = Object.keys(gdpEstimates).find(c => 
                d.country.includes(c) || c.includes(d.country)
            );
            
            const gdp = (gdpCountry ? gdpEstimates[gdpCountry] : 1.0) * 1e12;
            
            return {
                country: d.country,
                year: d.year,
                totalTradeVolume: (+d.total_trade) || (+d.imports) + (+d.exports),
                tradeBalance: (+d.balance) || (+d.exports) - (+d.imports),
                tradeOpenness: (((+d.total_trade) || (+d.imports) + (+d.exports)) / gdp) * 100
            };
        });
        
        // Filter out non-country entities and very small values
        chartData = chartData.filter(d => {
            const isCountry = !d.country.includes('Areas') && !d.country.includes('nes');
            const hasSignificantTrade = d.totalTradeVolume > 1e9; // At least 1 billion in trade
            return isCountry && hasSignificantTrade;
        });
    } else {
        console.log("Processing raw trade flow data");
        // Process from raw trade flows like before
        const countryData = {};
        
        // Group trade data by country and year
        tradeData.forEach(d => {
            const year = d.year;
            const reporterName = d.reporter;
            const flow = d.flow;
            const value = +d.value;
            
            if (!countryData[reporterName]) {
                countryData[reporterName] = {};
            }
            
            if (!countryData[reporterName][year]) {
                countryData[reporterName][year] = {
                    imports: 0,
                    exports: 0
                };
            }
            
            if (flow === 'import') {
                countryData[reporterName][year].imports += value;
            } else {
                countryData[reporterName][year].exports += value;
            }
        });
        
        // Calculate metrics for each country for each year
        Object.keys(countryData).forEach(country => {
            Object.keys(countryData[country]).forEach(year => {
                const yearData = countryData[country][year];
                
                // GDP estimates from our existing data
                const gdpEstimates = {
                    'United States': 23.0,
                    'China': 17.7, 
                    'Japan': 5.0,
                    'Germany': 4.2,
                    'United Kingdom': 3.1,
                    'India': 3.2,
                    'France': 2.9,
                    'Italy': 2.1,
                    'Canada': 1.9,
                    'Rep. of Korea': 1.8,
                    'Australia': 1.5,
                    'Brazil': 1.8,
                    'Spain': 1.4,
                    'Mexico': 1.3,
                    'Netherlands': 1.0
                };
                
                // Match country names that might differ
                const gdpCountry = Object.keys(gdpEstimates).find(c => 
                    country.includes(c) || c.includes(country)
                );
                
                const gdp = (gdpCountry ? gdpEstimates[gdpCountry] : 1.0) * 1e12;
                
                // Calculate metrics
                yearData.totalTradeVolume = yearData.imports + yearData.exports;
                yearData.tradeBalance = yearData.exports - yearData.imports;
                yearData.tradeOpenness = (yearData.totalTradeVolume / gdp) * 100;
            });
        });
        
        // Format data for line chart
        Object.keys(countryData).forEach(country => {
            // Find matching country in tradeSummaryData for proper names
            const summaryCountry = tradeSummaryData.find(c => 
                c.country === country || 
                c.country.includes(country) || 
                country.includes(c.country)
            );
            
            const countryName = summaryCountry ? summaryCountry.country : country;
            
            // Skip countries that aren't in our main dataset
            if (!summaryCountry) return;
            
            // Skip "Areas, nes" and similar non-countries
            if (country.includes('Area') || country.includes('nes')) return;
            
            years.forEach(year => {
                if (countryData[country][year]) {
                    chartData.push({
                        country: countryName,
                        year: year,
                        totalTradeVolume: countryData[country][year].totalTradeVolume,
                        tradeBalance: countryData[country][year].tradeBalance,
                        tradeOpenness: countryData[country][year].tradeOpenness
                    });
                }
            });
        });
    }
    
    // Log some statistics about the processed data
    console.log(`Processed ${chartData.length} data points for historical trend chart`);
    console.log(`Years available: ${years.join(', ')}`);
    console.log(`Countries included: ${Array.from(new Set(chartData.map(d => d.country))).join(', ')}`);
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);
    
    // Create group for the chart area
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Define regions for grouping
    const regions = {
        'North America': ['USA', 'Canada', 'Mexico'],
        'Europe': ['Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands'],
        'Asia-Pacific': ['China', 'Japan', 'Rep. of Korea', 'Australia', 'India'],
        'South America': ['Brazil']
    };
    
    // Assign regions to countries
    chartData.forEach(d => {
        for (const [region, countries] of Object.entries(regions)) {
            if (countries.some(c => d.country.includes(c) || c.includes(d.country))) {
                d.region = region;
                break;
            }
        }
        d.region = d.region || 'Other';
    });
    
    // Color scale for countries
    const countryColors = d3.scaleOrdinal()
        .domain(Array.from(new Set(chartData.map(d => d.country))))
        .range(d3.schemeCategory10);
    
    // Color scale for regions
    const regionColors = d3.scaleOrdinal()
        .domain(Object.keys(regions))
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);
    
    // Set default metric and filter
    let currentMetric = 'totalTradeVolume';
    let currentFilter = 'top5';
    
    // Update function
    function updateChart() {
        // Clear previous elements
        g.selectAll('*').remove();
        
        // Filter data based on current selection
        let filteredData = [...chartData];
        
        if (currentFilter === 'top5') {
            // Get top 5 countries by the currently selected metric
            const latestYear = Math.max(...years);
            const topCountries = Array.from(new Set(
                chartData.filter(d => d.year === String(latestYear))
                    .sort((a, b) => b[currentMetric] - a[currentMetric])
                    .slice(0, 5)
                    .map(d => d.country)
            ));
            
            filteredData = chartData.filter(d => topCountries.includes(d.country));
        } else if (currentFilter === 'regions') {
            // Aggregate by region
            const regionData = [];
            
            // Group by region and year
            const regionGroups = d3.group(chartData, d => d.region, d => d.year);
            
            regionGroups.forEach((yearMap, region) => {
                yearMap.forEach((entries, year) => {
                    regionData.push({
                        country: region, // Use region as country for display
                        region: region,
                        year: year,
                        totalTradeVolume: d3.sum(entries, d => d.totalTradeVolume),
                        tradeBalance: d3.sum(entries, d => d.tradeBalance),
                        tradeOpenness: d3.mean(entries, d => d.tradeOpenness)
                    });
                });
            });
            
            filteredData = regionData;
        }
        
        // Group data by country
        const groupedData = d3.group(filteredData, d => d.country);
        
        // Setup scales
        const xScale = d3.scaleLinear()
            .domain([d3.min(years), d3.max(years)])
            .range([0, innerWidth]);
        
        // Y scale depends on the metric
        const yExtent = d3.extent(filteredData, d => d[currentMetric]);
        // Add 10% padding to y extent
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([innerHeight, 0]);
        
        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d)
            .ticks(years.length);
        
        const yAxis = d3.axisLeft(yScale);
        
        // Add axes
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', innerWidth / 2)
            .attr('y', 40)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Year');
        
        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -60)
            .attr('x', -innerHeight / 2)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text(getMetricLabel(currentMetric));
        
        // Line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d[currentMetric]))
            .curve(d3.curveMonotoneX);
        
        // Add lines
        groupedData.forEach((values, country) => {
            // Sort by year
            values.sort((a, b) => a.year - b.year);
            
            // Add line
            g.append('path')
                .datum(values)
                .attr('fill', 'none')
                .attr('stroke', currentFilter === 'regions' ? regionColors(country) : countryColors(country))
                .attr('stroke-width', 2.5)
                .attr('d', line);
            
            // Add dots for each data point
            g.selectAll(`.dot-${country.replace(/\s+/g, '-')}`)
                .data(values)
                .enter()
                .append('circle')
                .attr('class', `dot-${country.replace(/\s+/g, '-')}`)
                .attr('cx', d => xScale(d.year))
                .attr('cy', d => yScale(d[currentMetric]))
                .attr('r', 5)
                .attr('fill', currentFilter === 'regions' ? regionColors(country) : countryColors(country))
                .on('mouseover', function(event, d) {
                    // Show tooltip
                    const tooltip = d3.select('#tooltip');
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9)
                        .style('display', 'block');
                    
                    const formatter = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        notation: 'compact',
                        maximumFractionDigits: 1
                    });
                    
                    let tooltipContent = `<strong>${d.country}</strong><br>`;
                    tooltipContent += `Year: ${d.year}<br>`;
                    
                    if (currentMetric === 'totalTradeVolume') {
                        tooltipContent += `Total Trade: ${formatter.format(d.totalTradeVolume)}<br>`;
                        tooltipContent += `Exports: ${formatter.format(d.totalTradeVolume / 2 + d.tradeBalance / 2)}<br>`;
                        tooltipContent += `Imports: ${formatter.format(d.totalTradeVolume / 2 - d.tradeBalance / 2)}`;
                    } else if (currentMetric === 'tradeBalance') {
                        tooltipContent += `Trade Balance: ${formatter.format(d.tradeBalance)}<br>`;
                        tooltipContent += `Exports: ${formatter.format(d.totalTradeVolume / 2 + d.tradeBalance / 2)}<br>`;
                        tooltipContent += `Imports: ${formatter.format(d.totalTradeVolume / 2 - d.tradeBalance / 2)}`;
                    } else {
                        tooltipContent += `Trade Openness: ${d.tradeOpenness.toFixed(1)}%<br>`;
                        tooltipContent += `Total Trade: ${formatter.format(d.totalTradeVolume)}`;
                    }
                    
                    tooltip.html(tooltipContent)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                    
                    // Highlight the dot
                    d3.select(this)
                        .attr('r', 8)
                        .attr('stroke', '#333')
                        .attr('stroke-width', 2);
                })
                .on('mouseout', function() {
                    // Restore original appearance
                    d3.select(this)
                        .attr('r', 5)
                        .attr('stroke', 'none');
                    
                    // Hide tooltip
                    d3.select('#tooltip')
                        .transition()
                        .duration(500)
                        .style('opacity', 0)
                        .style('display', 'none');
                });
            
            // Add country label at the end of each line
            const lastPoint = values[values.length - 1];
            g.append('text')
                .attr('x', xScale(lastPoint.year) + 10)
                .attr('y', yScale(lastPoint[currentMetric]))
                .attr('dy', '0.35em')
                .style('font-size', '12px')
                .style('font-weight', 'bold')
                .text(country);
        });
        
        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - margin.right + 20}, ${margin.top})`);
        
        // Add title based on metric
        legend.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('font-weight', 'bold')
            .attr('fill', '#000000')
            .text(getMetricLabel(currentMetric));
        
        // Add legend items
        const legendItems = currentFilter === 'regions' 
            ? Array.from(new Set(filteredData.map(d => d.region)))
            : Array.from(groupedData.keys());
        
        legendItems.forEach((item, i) => {
            const legendGroup = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
            
            legendGroup.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', currentFilter === 'regions' ? regionColors(item) : countryColors(item));
            
            legendGroup.append('text')
                .attr('x', 20)
                .attr('y', 7.5)
                .attr('dy', '0.35em')
                .style('font-size', '12px')
                .text(item);
        });
    }
    
    // Helper function to get label for metric
    function getMetricLabel(metric) {
        switch(metric) {
            case 'totalTradeVolume':
                return 'Total Trade Volume (USD)';
            case 'tradeBalance':
                return 'Trade Balance (USD)';
            case 'tradeOpenness':
                return 'Trade Openness (% of GDP)';
            default:
                return metric;
        }
    }
    
    // Set up event listeners for controls
    document.getElementById('metric-volume').addEventListener('click', function() {
        document.querySelectorAll('#history-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentMetric = 'totalTradeVolume';
        updateChart();
    });
    
    document.getElementById('metric-balance').addEventListener('click', function() {
        document.querySelectorAll('#history-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentMetric = 'tradeBalance';
        updateChart();
    });
    
    document.getElementById('metric-openness').addEventListener('click', function() {
        document.querySelectorAll('#history-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        currentMetric = 'tradeOpenness';
        updateChart();
    });
    
    document.getElementById('history-filter').addEventListener('change', function() {
        currentFilter = this.value;
        updateChart();
    });
    
    // Draw initial chart
    updateChart();
}

// Geographic Map Visualization
function createGeographicMap(tradeFlowsData, tradeSummaryData, worldGeoData) {
    console.log("Creating geographic map visualization...");
    const container = document.getElementById('map-chart');
    if (!container) {
        console.error("Map chart container not found");
        return;
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Define regions for grouping
    const regions = {
        'North America': ['USA', 'CAN', 'MEX'],
        'Europe': ['DEU', 'GBR', 'FRA', 'ITA', 'ESP', 'NLD'],
        'Asia-Pacific': ['CHN', 'JPN', 'KOR', 'AUS', 'IND'],
        'South America': ['BRA']
    };
    
    // Colors for regions
    const regionColors = {
        'North America': '#e74c3c',   // Bright red
        'Europe': '#3498db',          // Bright blue
        'Asia-Pacific': '#2ecc71',    // Bright green
        'South America': '#f39c12',   // Bright orange
        'Other': '#9b59b6'            // Purple
    };
    
    // Country code to ISO3 mapping based on our trade network data
    const countryCodesISO3 = {
        '36': 'AUS', '76': 'BRA', '124': 'CAN', '156': 'CHN', '251': 'FRA',
        '276': 'DEU', '699': 'IND', '380': 'ITA', '392': 'JPN', '484': 'MEX',
        '528': 'NLD', '410': 'KOR', '724': 'ESP', '826': 'GBR', '842': 'USA'
    };
    
    // Country coordinates (approximate capital or center point for better visualization)
    const countryCoordinates = {
        'AUS': [149.13, -35.28],  // Canberra
        'BRA': [-47.93, -15.78],  // Brasilia
        'CAN': [-75.70, 45.42],   // Ottawa
        'CHN': [116.39, 39.91],   // Beijing
        'FRA': [2.35, 48.85],     // Paris
        'DEU': [13.40, 52.52],    // Berlin
        'IND': [77.21, 28.61],    // New Delhi
        'ITA': [12.48, 41.89],    // Rome
        'JPN': [139.76, 35.68],   // Tokyo
        'MEX': [-99.13, 19.43],   // Mexico City
        'NLD': [4.90, 52.37],     // Amsterdam
        'KOR': [126.98, 37.57],   // Seoul
        'ESP': [-3.70, 40.42],    // Madrid
        'GBR': [-0.13, 51.51],    // London
        'USA': [-77.03, 38.90]    // Washington DC
    };
    
    // Process trade flow data for the map
    const countryNames = {};
    const tradeLinks = [];
    
    // First pass: get country names
    tradeFlowsData.forEach(d => {
        const reporterCode = d.reporter_code;
        const partnerCode = d.partner_code;
        
        if (reporterCode in countryCodesISO3) {
            countryNames[countryCodesISO3[reporterCode]] = d.reporter;
        }
        
        if (partnerCode in countryCodesISO3) {
            countryNames[countryCodesISO3[partnerCode]] = d.partner;
        }
    });
    
    // Get the most recent year in the data
    const years = Array.from(new Set(tradeFlowsData.map(d => d.year))).sort();
    const mostRecentYear = years[years.length - 1];
    
    // Second pass: build trade flows between our main countries
    tradeFlowsData.forEach(d => {
        // Only use the most recent year and flows between main countries
        if (d.year === mostRecentYear && 
            d.reporter_code in countryCodesISO3 && 
            d.partner_code in countryCodesISO3) {
            
            const sourceISO = countryCodesISO3[d.reporter_code];
            const targetISO = countryCodesISO3[d.partner_code];
            
            // Skip self-trade
            if (sourceISO === targetISO) return;
            
            // Get the region for each country
            let sourceRegion = 'Other';
            let targetRegion = 'Other';
            
            for (const [region, countries] of Object.entries(regions)) {
                if (countries.includes(sourceISO)) {
                    sourceRegion = region;
                }
                if (countries.includes(targetISO)) {
                    targetRegion = region;
                }
            }
            
            tradeLinks.push({
                source: sourceISO,
                target: targetISO,
                sourceName: countryNames[sourceISO],
                targetName: countryNames[targetISO],
                sourceRegion: sourceRegion,
                targetRegion: targetRegion,
                flow: d.flow,
                value: +d.value
            });
        }
    });
    
    // Group by country pairs to combine import and export flows
    const combinedLinks = {};
    
    tradeLinks.forEach(link => {
        const pairKey = [link.source, link.target].sort().join('-');
        
        if (!combinedLinks[pairKey]) {
            combinedLinks[pairKey] = {
                source: link.source,
                target: link.target,
                sourceName: link.sourceName,
                targetName: link.targetName,
                sourceRegion: link.sourceRegion,
                targetRegion: link.targetRegion,
                imports: 0,
                exports: 0,
                total: 0
            };
        }
        
        if (link.flow === 'import') {
            // This is the target importing from source
            combinedLinks[pairKey].imports += link.value;
        } else {
            // This is the source exporting to target
            combinedLinks[pairKey].exports += link.value;
        }
        
        combinedLinks[pairKey].total += link.value;
    });
    
    // Convert to array
    const mapLinks = Object.values(combinedLinks);
    
    // Sort by total value
    mapLinks.sort((a, b) => b.total - a.total);
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);
    
    // Map projection
    const projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 1.5]);
    
    // Path generator
    const path = d3.geoPath().projection(projection);
    
    // Draw the map background
    svg.append('g')
        .selectAll('path')
        .data(worldGeoData.features)
        .join('path')
        .attr('d', path)
        .attr('fill', '#34495e')
        .attr('stroke', '#2c3e50')
        .attr('stroke-width', 0.5);
    
    // Create a group for country points and trade flows
    const g = svg.append('g');
    
    // Add country circles
    const countryPoints = g.selectAll('.country-point')
        .data(Object.entries(countryCoordinates))
        .join('circle')
        .attr('class', 'country-point')
        .attr('cx', d => projection(d[1])[0])
        .attr('cy', d => projection(d[1])[1])
        .attr('r', 7)
        .attr('fill', d => {
            // Find the region of this country
            let region = 'Other';
            for (const [r, countries] of Object.entries(regions)) {
                if (countries.includes(d[0])) {
                    region = r;
                    break;
                }
            }
            return regionColors[region];
        })
        .attr('stroke', '#000000')
        .attr('stroke-width', 1)
        .attr('data-country', d => d[0])
        .on('mouseover', function(event, d) {
            // Highlight this country
            d3.select(this)
                .attr('r', 10)
                .attr('stroke-width', 2);
                
            // Get country name
            const countryName = countryNames[d[0]];
            
            // Show tooltip
            const tooltip = d3.select('#tooltip');
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9)
                .style('display', 'block');
                
            tooltip.html(`<strong>${countryName}</strong>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            // Restore original appearance
            d3.select(this)
                .attr('r', 7)
                .attr('stroke', 'none');
                
            // Hide tooltip
            d3.select('#tooltip')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .style('display', 'none');
        });
    
    // Add country labels
    g.selectAll('.country-label')
        .data(Object.entries(countryCoordinates))
        .join('text')
        .attr('class', 'country-label')
        .attr('x', d => projection(d[1])[0] + 12)
        .attr('y', d => projection(d[1])[1] + 4)
        .text(d => d[0])
        .attr('font-size', '10px')
        .attr('fill', '#000000')
        .attr('text-anchor', 'start')
        .attr('data-country', d => d[0]);
    
    // Function to create trade flow paths
    function createArcPath(source, target) {
        const sourceCoords = projection(countryCoordinates[source]);
        const targetCoords = projection(countryCoordinates[target]);
        
        const dx = targetCoords[0] - sourceCoords[0];
        const dy = targetCoords[1] - sourceCoords[1];
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Determine if this is a major flow path
        let arcScale = 1.5; // Default scale
        
        // Draw a curved path between countries
        return `M${sourceCoords[0]},${sourceCoords[1]}A${dr * arcScale},${dr * arcScale} 0 0,1 ${targetCoords[0]},${targetCoords[1]}`;
    }
    
    // Function to draw all flows
    function drawFlows(filter) {
        // Remove existing flows
        g.selectAll('.trade-flow').remove();
        
        // Filter the links based on the selected flow type
        let filteredLinks = mapLinks;
        
        if (filter === 'exports') {
            filteredLinks = mapLinks.filter(d => d.exports > 0);
        } else if (filter === 'imports') {
            filteredLinks = mapLinks.filter(d => d.imports > 0);
        }
        
        // Get the country filter
        const countryFilter = document.getElementById('map-country-filter').value;
        
        if (countryFilter !== 'all') {
            filteredLinks = filteredLinks.filter(d => 
                d.source === countryFilter || d.target === countryFilter
            );
        }
        
        // Draw the links with animation path
        const flows = g.selectAll('.trade-flow')
            .data(filteredLinks)
            .join('path')
            .attr('class', 'trade-flow')
            .attr('d', d => createArcPath(d.source, d.target))
            .attr('fill', 'none')
            .attr('stroke', d => {
                // Use regional colors - use source region color
                return regionColors[d.sourceRegion];
            })
            .attr('stroke-width', d => {
                // Scale by value, but keep a reasonable range
                return Math.max(0.5, Math.min(5, Math.log10(d.total) / 2));
            })
            .attr('stroke-opacity', 0.6)
            .attr('data-source', d => d.source)
            .attr('data-target', d => d.target)
            .on('mouseover', function(event, d) {
                // Highlight this flow
                d3.select(this)
                    .attr('stroke-opacity', 1)
                    .attr('stroke-width', d => {
                        return Math.max(1, Math.min(7, Math.log10(d.total) / 2 + 2));
                    });
                
                // Highlight the connected countries
                d3.selectAll(`.country-point[data-country="${d.source}"], .country-point[data-country="${d.target}"]`)
                    .attr('r', 10)
                    .attr('stroke-width', 2);
                
                // Format the value
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1
                });
                
                // Show tooltip
                const tooltip = d3.select('#tooltip');
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9)
                    .style('display', 'block');
                
                tooltip.html(`
                    <strong>${d.sourceName} ↔ ${d.targetName}</strong><br>
                    Total Trade: ${formatter.format(d.total)}<br>
                    Exports: ${formatter.format(d.exports)}<br>
                    Imports: ${formatter.format(d.imports)}
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                // Restore original appearance
                d3.select(this)
                    .attr('stroke-opacity', 0.6)
                    .attr('stroke-width', d => {
                        return Math.max(0.5, Math.min(5, Math.log10(d.total) / 2));
                    });
                
                // Restore country points
                d3.selectAll('.country-point')
                    .attr('r', 7)
                    .attr('stroke-width', 1);
                
                // Hide tooltip
                d3.select('#tooltip')
                    .transition()
                    .duration(500)
                    .style('opacity', 0)
                    .style('display', 'none');
            });
        
        // If animation is checked, add moving dots along the paths
        if (document.getElementById('map-animate').checked) {
            // Add animated dots
            flows.each(function(d) {
                const path = d3.select(this);
                const pathLength = path.node().getTotalLength();
                
                // Add animated flow markers
                const numDots = Math.min(5, Math.max(1, Math.floor(Math.log10(d.total)) - 7));
                
                for (let i = 0; i < numDots; i++) {
                    g.append('circle')
                        .attr('class', 'flow-dot')
                        .attr('r', 3)
                        .attr('fill', regionColors[d.sourceRegion])
                        .style('mix-blend-mode', 'screen')
                        .append('animate')
                        .attr('attributeName', 'transform')
                        .attr('begin', `${i * (1.0 / numDots)}s`)
                        .attr('repeatCount', 'indefinite')
                        .attr('dur', '2s')
                        .attr('keyTimes', '0;1')
                        .attr('keySplines', '0.5 0 0.5 1')
                        .attr('calcMode', 'spline')
                        .attr('values', function() {
                            let values = [];
                            for (let i = 0; i <= 1; i += 0.01) {
                                const point = path.node().getPointAtLength(i * pathLength);
                                values.push(`translate(${point.x}, ${point.y})`);
                            }
                            return values.join(';');
                        });
                }
            });
        }
    }
    
    // Draw flows initially
    drawFlows('all');
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(20, 20)`);
    
    // Add title
    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-weight', 'bold')
        .attr('fill', '#000000')
        .text('Regions');
    
    // Add legend items
    Object.entries(regions).forEach(([region, countries], i) => {
        const legendGroup = legend.append('g')
            .attr('transform', `translate(0, ${i * 20 + 20})`);
        
        legendGroup.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', regionColors[region]);
        
        legendGroup.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('fill', '#000000')
            .text(region);
    });
    
    // Set up event handlers for controls
    document.getElementById('map-show-all').addEventListener('click', function() {
        document.querySelectorAll('#map-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        drawFlows('all');
    });
    
    document.getElementById('map-show-exports').addEventListener('click', function() {
        document.querySelectorAll('#map-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        drawFlows('exports');
    });
    
    document.getElementById('map-show-imports').addEventListener('click', function() {
        document.querySelectorAll('#map-panel .btn-group button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        drawFlows('imports');
    });
    
    document.getElementById('map-country-filter').addEventListener('change', function() {
        // Get the current flow type
        let flowType = 'all';
        if (document.getElementById('map-show-exports').classList.contains('active')) {
            flowType = 'exports';
        } else if (document.getElementById('map-show-imports').classList.contains('active')) {
            flowType = 'imports';
        }
        
        drawFlows(flowType);
    });
    
    document.getElementById('map-animate').addEventListener('change', function() {
        // Get the current flow type
        let flowType = 'all';
        if (document.getElementById('map-show-exports').classList.contains('active')) {
            flowType = 'exports';
        } else if (document.getElementById('map-show-imports').classList.contains('active')) {
            flowType = 'imports';
        }
        
        // Redraw with or without animation
        drawFlows(flowType);
    });
}

// Sector-Based Network Graph
function createSectorNetworkGraph(tradeData, sectorFilter) {
    console.log(`Creating sector network graph for ${sectorFilter}...`);
    const container = document.getElementById('sector-chart');
    if (!container) {
        console.error("Sector chart container not found");
        return;
    }
    
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    
    // Check if we have sector-specific data or need to simulate it
    const hasSectorData = tradeData.length > 0 && 'sector' in tradeData[0];
    
    // Process the data for the network graph
    let nodes = [];
    let links = [];
    const nodeMap = new Map();
    
    if (hasSectorData) {
        console.log("Using actual sector data");
        // Filter by sector
        const filteredData = tradeData.filter(d => d.sector === sectorFilter);
        
        // Get the most recent year
        const years = Array.from(new Set(filteredData.map(d => d.year))).sort();
        const mostRecentYear = years[years.length - 1];
        
        // Further filter by most recent year
        const yearData = filteredData.filter(d => d.year === mostRecentYear);
        
        // Build nodes from unique countries
        const countries = new Set();
        yearData.forEach(d => {
            countries.add(d.reporter);
            countries.add(d.partner);
        });
        
        nodes = Array.from(countries).map((name, i) => {
            const node = {
                id: name,
                name: name,
                group: 1,
                value: 0 // Will be summed below
            };
            nodeMap.set(name, node);
            return node;
        });
        
        // Build links and calculate node values
        yearData.forEach(d => {
            // Ensure we have both reporter and partner in our nodes
            if (!nodeMap.has(d.reporter) || !nodeMap.has(d.partner)) return;
            
            // Skip self-links
            if (d.reporter === d.partner) return;
            
            // Check the value threshold if we're not showing all countries
            if (!document.getElementById('sector-show-all').checked && d.value < 1e9) return;
            
            // Update node values
            nodeMap.get(d.reporter).value += d.value;
            
            // Create link
            links.push({
                source: d.reporter,
                target: d.partner,
                value: d.value
            });
        });
    } else {
        console.log("Simulating sector data from general trade flows");
        // Get the most recent year
        const years = Array.from(new Set(tradeData.map(d => d.year))).sort();
        const mostRecentYear = years[years.length - 1];
        
        // Filter by most recent year
        const yearData = tradeData.filter(d => d.year === mostRecentYear);
        
        // Build nodes from unique countries
        const countries = new Set();
        yearData.forEach(d => {
            countries.add(d.reporter);
            countries.add(d.partner);
        });
        
        // Predefined node groups by region
        const regions = {
            'North America': ['United States', 'Canada', 'Mexico'],
            'Europe': ['Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Netherlands'],
            'Asia-Pacific': ['China', 'Japan', 'Rep. of Korea', 'Australia', 'India'],
            'South America': ['Brazil']
        };
        
        // Convert to region indices
        const regionIndices = {};
        Object.keys(regions).forEach((region, i) => {
            regions[region].forEach(country => {
                regionIndices[country] = i + 1;
            });
        });
        
        // Only keep major economies
        const majorEconomies = [
            'China', 'United States', 'Japan', 'Germany', 'United Kingdom',
            'France', 'India', 'Italy', 'Brazil', 'Canada', 'Korea, Rep.',
            'Australia', 'Spain', 'Mexico', 'Indonesia', 'Netherlands',
            'Saudi Arabia', 'Turkey', 'Switzerland', 'Poland', 'Sweden',
            'Belgium', 'Thailand', 'Ireland', 'Norway'
        ];
        
        // Create nodes for major economies only
        nodes = Array.from(countries)
            .filter(country => {
                // Only keep major economies or countries that match part of a major economy name
                return majorEconomies.some(major => 
                    country.includes(major) || major.includes(country)
                );
            })
            .map((name, i) => {
                // Determine group from regions
                let group = 5; // Default group
                for (const [region, countries] of Object.entries(regions)) {
                    if (countries.some(c => name.includes(c) || c.includes(name))) {
                        group = regionIndices[countries.find(c => name.includes(c) || c.includes(name))];
                        break;
                    }
                }
                
                const node = {
                    id: name,
                    name: name,
                    group: group,
                    value: 0 // Will be summed below
                };
                nodeMap.set(name, node);
                return node;
            });
        
        // Sort the flows randomly to simulate different sectors
        const sortedFlows = [...yearData].sort((a, b) => {
            // Virtual "sector scores" based on the hash of reporter+partner
            const hashA = (a.reporter.charCodeAt(0) + a.partner.charCodeAt(0)) % 6;
            const hashB = (b.reporter.charCodeAt(0) + b.partner.charCodeAt(0)) % 6;
            
            // Sectors: 0=agriculture, 1=energy, 2=machinery, 3=automotive, 4=textiles, 5=pharmaceuticals
            const sectors = ['agriculture', 'energy', 'machinery', 'automotive', 'textiles', 'pharmaceuticals'];
            const sectorIndex = sectors.indexOf(sectorFilter);
            
            // Prefer flows that "match" the requested sector
            return Math.abs(hashA - sectorIndex) - Math.abs(hashB - sectorIndex);
        });
        
        // Take the top flows for this simulated sector
        const topFlows = sortedFlows.slice(0, 500);
        
        // Build links and calculate node values
        topFlows.forEach(d => {
            // Only create links between major economies
            if (!nodeMap.has(d.reporter) || !nodeMap.has(d.partner)) return;
            
            // Skip self-links
            if (d.reporter === d.partner) return;
            
            // Apply a random factor to simulate sector specificity
            const sectorFactor = 0.5 + Math.random();
            const adjustedValue = d.flow === 'export' ? d.value * sectorFactor : d.value * sectorFactor;
            
            // Update node values
            nodeMap.get(d.reporter).value += adjustedValue;
            
            // Create link
            links.push({
                source: d.reporter,
                target: d.partner,
                value: adjustedValue
            });
        });
    }
    
    // Filter out nodes with no connections if not showing all
    if (!document.getElementById('sector-show-all').checked) {
        const connectedNodes = new Set();
        links.forEach(link => {
            connectedNodes.add(link.source);
            connectedNodes.add(link.target);
        });
        nodes = nodes.filter(node => connectedNodes.has(node.id));
    }
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .attr('style', 'max-width: 100%; height: auto;');
    
    // Define color scale for nodes by group
    const colorScale = d3.scaleOrdinal()
        .domain([1, 2, 3, 4, 5])
        .range(['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6']);
    
    // Calculate min and max values for node sizing
    const nodeValues = nodes.map(d => d.value || 1);
    const minValue = Math.min(...nodeValues);
    const maxValue = Math.max(...nodeValues);
    
    // Create a size scale for nodes
    const sizeScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([5, 30]);
    
    // Create a force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-800))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => Math.max(30, sizeScale(d.value))));
    
    // Create links
    const link = svg.append('g')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.4)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', d => {
            // Calculate a reasonable stroke width
            return Math.max(0.5, Math.min(3, Math.log10(d.value || 1) / 4));
        });
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => Math.max(5, sizeScale(d.value || 1)))
        .attr('fill', d => colorScale(d.group))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            // Highlight this node
            d3.select(this)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
            
            // Highlight connected links
            link.attr('stroke', function(l) {
                if (l.source.id === d.id || l.target.id === d.id) {
                    return colorScale(d.group);
                } else {
                    return '#999';
                }
            })
            .attr('stroke-opacity', function(l) {
                return (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1;
            })
            .attr('stroke-width', function(l) {
                if (l.source.id === d.id || l.target.id === d.id) {
                    return Math.max(1, Math.min(5, Math.log10(l.value || 1) / 3));
                } else {
                    return Math.max(0.5, Math.min(2, Math.log10(l.value || 1) / 5));
                }
            });
            
            // Highlight connected nodes
            node.attr('opacity', function(n) {
                if (n.id === d.id) return 1;
                
                // Check if connected
                const connected = links.some(l => 
                    (l.source.id === d.id && l.target.id === n.id) || 
                    (l.source.id === n.id && l.target.id === d.id)
                );
                
                return connected ? 1 : 0.3;
            });
            
            // Format value for tooltip
            const valueFormatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1
            });
            
            // Show tooltip
            const tooltip = d3.select('#tooltip');
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9)
                .style('display', 'block');
            
            tooltip.html(`
                <strong>${d.name}</strong><br>
                ${sectorFilter.charAt(0).toUpperCase() + sectorFilter.slice(1)} Trade Value: ${valueFormatter.format(d.value || 0)}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            // Restore original appearance
            d3.select(this)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5);
            
            // Restore all links
            link.attr('stroke', '#999')
                .attr('stroke-opacity', 0.4)
                .attr('stroke-width', d => {
                    return Math.max(0.5, Math.min(3, Math.log10(d.value || 1) / 4));
                });
            
            // Restore all nodes
            node.attr('opacity', 1);
            
            // Hide tooltip
            d3.select('#tooltip')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .style('display', 'none');
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add labels for nodes
    const label = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('font-size', 10)
        .attr('font-weight', 'bold')
        .attr('fill', '#000000')
        .attr('dy', 4)
        .attr('dx', d => sizeScale(d.value || 1) + 5)
        .text(d => d.name)
        .on('mouseover', function(event, d) {
            // Trigger the same event on the corresponding node
            node.filter(n => n.id === d.id).dispatch('mouseover');
        })
        .on('mouseout', function(event, d) {
            // Trigger the same event on the corresponding node
            node.filter(n => n.id === d.id).dispatch('mouseout');
        });
    
    // Add title based on the sector
    svg.append('text')
        .attr('x', 20)
        .attr('y', 30)
        .attr('font-size', 16)
        .attr('font-weight', 'bold')
        .attr('fill', '#000000')
        .text(`${sectorFilter.charAt(0).toUpperCase() + sectorFilter.slice(1)} Sector Trade Network`);
    
    // Add region legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 170}, 20)`);
    
    const regions = ['North America', 'Europe', 'Asia-Pacific', 'South America', 'Other'];
    
    regions.forEach((region, i) => {
        const legendGroup = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
        
        legendGroup.append('circle')
            .attr('r', 6)
            .attr('fill', colorScale(i + 1));
        
        legendGroup.append('text')
            .attr('x', 12)
            .attr('y', 4)
            .attr('font-size', 12)
            .attr('fill', '#000000')
            .text(region);
    });
    
    // Add simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', zoomed);
    
    svg.call(zoom);
    
    function zoomed(event) {
        link.attr('transform', event.transform);
        node.attr('transform', event.transform);
        label.attr('transform', event.transform);
    }
}