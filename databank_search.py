#!/usr/bin/env python3
"""
Script to fetch global trade data using the UN Comtrade API.
Uses the comtradeapicall library to access free API endpoints.
"""

import comtradeapicall
import json
import os
import pandas as pd
from datetime import date, timedelta

# Create directory for data sources if it doesn't exist
os.makedirs('data_sources', exist_ok=True)

def fetch_trade_data():
    """
    Fetch global trade data using the UN Comtrade API.
    Focuses on free API calls that don't require a subscription key.
    """
    # Get current date and last week's date
    today = date.today()
    lastweek = today - timedelta(days=7)
    
    # Get years (last 10 years)
    years = [str(year) for year in range(today.year - 10, today.year)]
    
    # Major trading countries (ISO3 codes)
    countries = [
        'USA', 'CHN', 'DEU', 'JPN', 'GBR',  # Top 5
        'FRA', 'IND', 'ITA', 'CAN', 'KOR',   # Next 5
        'NLD', 'MEX', 'ESP', 'AUS', 'BRA'    # Next 5
    ]
    
    # Convert ISO3 codes to Comtrade codes
    country_codes = comtradeapicall.convertCountryIso3ToCode(','.join(countries))
    country_list = country_codes.split(',')
    
    # Trade flows to fetch (M=Imports, X=Exports)
    flows = ['M', 'X']
    flow_names = {'M': 'imports', 'X': 'exports'}
    
    # Create a directory for yearly data
    os.makedirs('data_sources/yearly', exist_ok=True)
    
    # Fetch data for each year, country, and flow
    for year in years:
        print(f"\nFetching data for {year}...")
        yearly_data = []
        
        for country in country_list:
            for flow in flows:
                print(f"Fetching {flow_names[flow]} for country code {country}...")
                try:
                    # Get preview data
                    df = comtradeapicall.previewFinalData(
                        typeCode='C',          # Commodities
                        freqCode='A',          # Annual
                        clCode='HS',           # Harmonized System
                        period=year,           # Year
                        reporterCode=country,  # Country
                        cmdCode='TOTAL',       # Total trade
                        flowCode=flow,         # Imports/Exports
                        partnerCode=None,      # All partners
                        partner2Code=None,
                        customsCode=None,
                        motCode=None,
                        maxRecords=500,
                        format_output='JSON',
                        aggregateBy=None,
                        breakdownMode='classic',
                        countOnly=None,
                        includeDesc=True
                    )
                    
                    if not df.empty:
                        # Add to yearly data
                        yearly_data.extend(df.to_dict('records'))
                        print(f"Found {len(df)} records")
                    else:
                        print("No data found")
                        
                except Exception as e:
                    print(f"Error fetching data: {str(e)}")
        
        # Save yearly data
        if yearly_data:
            with open(f'data_sources/yearly/trade_data_{year}.json', 'w') as f:
                json.dump(yearly_data, f, indent=2)
            print(f"Saved {len(yearly_data)} records for {year}")
    
    # Fetch and save reference data
    print("\nFetching reference data...")
    try:
        # Get list of reporters (countries)
        reporters_df = comtradeapicall.getReference('reporter')
        print(f"Found {len(reporters_df)} reporters")
        
        # Get list of partners (countries)
        partners_df = comtradeapicall.getReference('partner')
        print(f"Found {len(partners_df)} partners")
        
        # Save reference data
        reporters_df.to_json('data_sources/reporters.json', orient='records', indent=2)
        partners_df.to_json('data_sources/partners.json', orient='records', indent=2)
        
        # Create a mapping of country codes to names
        country_mapping = {
            row['reporterCode']: {
                'name': row['reporterDesc'],
                'iso2': row['reporterCodeIsoAlpha2'],
                'iso3': row['reporterCodeIsoAlpha3']
            }
            for _, row in reporters_df.iterrows()
        }
        
        with open('data_sources/country_mapping.json', 'w') as f:
            json.dump(country_mapping, f, indent=2)
            
    except Exception as e:
        print(f"Error fetching reference data: {str(e)}")

if __name__ == "__main__":
    fetch_trade_data()
