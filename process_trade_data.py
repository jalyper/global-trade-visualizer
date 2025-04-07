#!/usr/bin/env python3
"""
Script to process UN Comtrade data into formats needed for visualization.
"""

import json
import pandas as pd
import os
from collections import defaultdict

def load_country_mapping():
    """Load the country code to name mapping."""
    with open('data_sources/country_mapping.json', 'r') as f:
        mapping = json.load(f)
        # Convert string keys to integers
        return {int(k): v for k, v in mapping.items()}

def process_yearly_data():
    """Process yearly trade data into required formats."""
    # Create output directory
    os.makedirs('data/processed', exist_ok=True)
    
    # Load country mapping
    country_mapping = load_country_mapping()
    
    # Initialize data structures
    trade_flows = []
    trade_summary = defaultdict(lambda: {'imports': 0, 'exports': 0})
    trade_matrix = defaultdict(lambda: defaultdict(float))
    trade_network = {'nodes': [], 'links': []}
    
    # For yearly trends
    yearly_data = defaultdict(lambda: defaultdict(lambda: {'imports': 0, 'exports': 0}))
    
    # Process each year's data
    for year in range(2018, 2023):
        year_file = f'data_sources/yearly/trade_data_{year}.json'
        if not os.path.exists(year_file):
            continue
            
        with open(year_file, 'r') as f:
            data = json.load(f)
            
        for record in data:
            # Skip if not total trade
            if record.get('cmdCode') != 'TOTAL':
                continue
                
            reporter_code = int(record['reporterCode'])
            partner_code = int(record['partnerCode'])
            flow_code = record['flowCode']
            value = float(record.get('primaryValue', 0))
            
            # Skip if no value or if partner is "World" (code 0)
            if value == 0 or partner_code == 0:
                continue
                
            # Add to trade flows
            trade_flows.append({
                'year': year,
                'reporter_code': reporter_code,
                'reporter': record['reporterDesc'],
                'partner_code': partner_code,
                'partner': record['partnerDesc'],
                'flow': 'import' if flow_code == 'M' else 'export',
                'value': value
            })
            
            # Update trade summary (overall totals)
            if flow_code == 'M':
                trade_summary[reporter_code]['imports'] += value
            else:
                trade_summary[reporter_code]['exports'] += value
                
            # Update yearly data
            if flow_code == 'M':
                yearly_data[year][reporter_code]['imports'] += value
            else:
                yearly_data[year][reporter_code]['exports'] += value
                
            # Update trade matrix
            if flow_code == 'X':  # Only count exports to avoid double counting
                trade_matrix[reporter_code][partner_code] += value
                
    # Convert trade summary to list
    trade_summary_list = []
    for code, data in trade_summary.items():
        if code in country_mapping:
            trade_summary_list.append({
                'country_code': code,
                'country': country_mapping[code]['name'],
                'imports': data['imports'],
                'exports': data['exports'],
                'balance': data['exports'] - data['imports']
            })
            
    # Convert yearly data to list
    yearly_summary_list = []
    for year, countries in yearly_data.items():
        for code, data in countries.items():
            if code in country_mapping:
                yearly_summary_list.append({
                    'year': year,
                    'country_code': code,
                    'country': country_mapping[code]['name'],
                    'imports': data['imports'],
                    'exports': data['exports'],
                    'balance': data['exports'] - data['imports'],
                    'total_trade': data['imports'] + data['exports']
                })
                
    # Create network data
    nodes = set()
    links = []
    
    # Create a list of countries we care about
    top_countries = set([record['country_code'] for record in trade_summary_list])
    
    # Add nodes
    for code in top_countries:
        if code in country_mapping:
            country = country_mapping[code]
            nodes.add(code)
            trade_network['nodes'].append({
                'id': str(code),
                'name': country['name'],
                'code': country['iso3']
            })
    
    # Add links
    for exporter in top_countries:
        for importer in top_countries:
            if exporter != importer:
                if exporter in trade_matrix and importer in trade_matrix[exporter]:
                    value = trade_matrix[exporter][importer]
                    if value > 0:
                        links.append({
                            'source': str(exporter),
                            'target': str(importer),
                            'value': value
                        })
    
    trade_network['links'] = links
    
    # Convert to dataframe and save
    trade_flows_df = pd.DataFrame(trade_flows)
    trade_summary_df = pd.DataFrame(trade_summary_list)
    yearly_summary_df = pd.DataFrame(yearly_summary_list)
    
    # Save processed data
    trade_flows_df.to_csv('data/processed/trade_flows_raw.csv', index=False)
    trade_summary_df.to_csv('data/processed/trade_summary.csv', index=False)
    yearly_summary_df.to_csv('data/processed/yearly_trade_summary.csv', index=False)
    
    with open('data/processed/trade_network.json', 'w') as f:
        json.dump(trade_network, f)
    
    # Create matrix for chord diagram
    countries = [country_mapping[code]['name'] for code in top_countries if code in country_mapping]
    countries.sort()
    
    matrix = []
    for i, source_name in enumerate(countries):
        row = []
        source_code = None
        for code, country in country_mapping.items():
            if country['name'] == source_name:
                source_code = code
                break
        
        if source_code is None:
            continue
        
        for j, target_name in enumerate(countries):
            target_code = None
            for code, country in country_mapping.items():
                if country['name'] == target_name:
                    target_code = code
                    break
            
            if target_code is None:
                continue
            
            if source_code == target_code:
                row.append(0)  # No self-trade
            elif source_code in trade_matrix and target_code in trade_matrix[source_code]:
                row.append(trade_matrix[source_code][target_code])
            else:
                row.append(0)
        
        matrix.append(row)
    
    matrix_json = {
        'countries': countries,
        'matrix': matrix
    }
    
    with open('data/processed/trade_matrix.json', 'w') as f:
        json.dump(matrix_json, f)
    
    print(f"Processed {len(trade_flows)} trade flow records")
    print(f"Created summary for {len(trade_summary_list)} countries")
    print(f"Created yearly summary with {len(yearly_summary_list)} records")
    print(f"Created network with {len(trade_network['nodes'])} nodes and {len(trade_network['links'])} links")
    print(f"Created matrix for {len(countries)} countries")
    
    return trade_summary_df, matrix_json, trade_network

if __name__ == "__main__":
    process_yearly_data() 