#!/usr/bin/env python3
"""
Script to process UN Comtrade data into formats needed for visualization.
"""

import json
import pandas as pd
import os
from collections import defaultdict
import numpy as np

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
    for year in range(2015, 2026):
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

def create_sector_data():
    """
    Generate sector-specific trade data for visualization.
    Creates simulated data for 6 key sectors based on the overall trade patterns.
    """
    # Create output directory if it doesn't exist
    os.makedirs('data/processed', exist_ok=True)
    
    # Try to load existing trade flows
    try:
        trade_flows_df = pd.read_csv('data/processed/trade_flows_raw.csv')
    except:
        # If not available, process data first
        process_yearly_data()
        trade_flows_df = pd.read_csv('data/processed/trade_flows_raw.csv')
    
    # Define sectors
    sectors = ['agriculture', 'energy', 'machinery', 'automotive', 'textiles', 'pharmaceuticals']
    
    # Get unique countries
    countries = trade_flows_df['reporter'].unique()
    
    # Get most recent year
    most_recent_year = trade_flows_df['year'].max()
    recent_flows = trade_flows_df[trade_flows_df['year'] == most_recent_year]
    
    # Create sector data with weighted values for each sector
    sector_data = []
    
    for sector in sectors:
        # Use a different random seed for each sector to ensure different patterns
        np.random.seed(sectors.index(sector))
        
        for _, flow in recent_flows.iterrows():
            # Skip small flows and non-export flows
            if flow['value'] < 1e8 or flow['flow'] != 'export':
                continue
                
            # Add some randomness to make sectors different
            sector_factor = 0.2 + np.random.random() * 1.5
            
            # Some sectors are dominant for certain country pairs
            reporter = flow['reporter']
            partner = flow['partner']
            
            # Add sector-specific weightings
            if sector == 'agriculture':
                # Higher for agricultural exporters
                if reporter in ['Brazil', 'Australia', 'Netherlands']:
                    sector_factor *= 1.5
            elif sector == 'energy':
                # Higher for energy exporters
                if reporter in ['United States', 'Canada', 'Australia']:
                    sector_factor *= 2.0
            elif sector == 'machinery':
                # Higher for industrial exporters
                if reporter in ['Germany', 'Japan', 'China']:
                    sector_factor *= 1.8
            elif sector == 'automotive':
                # Higher for car manufacturing countries
                if reporter in ['Germany', 'Japan', 'United States', 'Korea, Rep.']:
                    sector_factor *= 1.7
            elif sector == 'textiles':
                # Higher for textile exporters
                if reporter in ['China', 'India', 'Italy']:
                    sector_factor *= 1.6
            elif sector == 'pharmaceuticals':
                # Higher for pharmaceutical exporters
                if reporter in ['United States', 'Germany', 'Switzerland']:
                    sector_factor *= 2.0
            
            # Only include some flows to avoid overcrowding
            if np.random.random() > 0.6:
                sector_data.append({
                    'sector': sector,
                    'reporter': reporter,
                    'partner': partner,
                    'reporter_code': flow['reporter_code'],
                    'partner_code': flow['partner_code'],
                    'value': flow['value'] * sector_factor,
                    'year': most_recent_year,
                    'flow': 'export'
                })
    
    # Convert to dataframe and save
    sector_df = pd.DataFrame(sector_data)
    sector_df.to_csv('data/processed/sector_trade_flows.csv', index=False)
    
    print(f"Created sector data with {len(sector_data)} records across {len(sectors)} sectors")
    
    return sector_df

if __name__ == "__main__":
    process_yearly_data()
    create_sector_data() 