import requests
import re
from termcolor import colored
from concurrent.futures import ThreadPoolExecutor

# List of proxy websites to scrape from
proxy_urls = [
    'https://www.sslproxies.org/',
    'https://free-proxy-list.net/',
    'https://www.us-proxy.org/'
]

# Regular expression to match IP:PORT format
proxy_pattern = r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+'

proxies = []
live_proxies = []
dead_proxies = []

# Scrape proxies from multiple sources
for url in proxy_urls:
    try:
        response = requests.get(url)
        if response.status_code == 200:
            content = response.text
            found_proxies = re.findall(proxy_pattern, content)
            proxies += found_proxies
            print(f"Scraped {len(found_proxies)} proxies from {url}")
        else:
            print(f"Failed to access {url}. Status code: {response.status_code}")
    except Exception as e:
        print(f"Error scraping {url}: {e}")

print(f"Total proxies scraped: {len(proxies)}")

# Proxy checker function
def check_proxy(proxy):
    proxy_parts = proxy.split(':')
    proxy_ip = proxy_parts[0]
    proxy_port = proxy_parts[1]
    proxy_url = f'http://{proxy_ip}:{proxy_port}'
    
    try:
        # Test proxy by trying to access Google
        response = requests.get('https://www.google.com', proxies={"http": proxy_url, "https": proxy_url}, timeout=10)
        if response.status_code == 200:
            print(colored(f"{proxy} - LIVE", 'green'))
            live_proxies.append(proxy)  # Add live proxy to the list
        else:
            print(colored(f"{proxy} - DEAD (Invalid response)", 'red'))
            dead_proxies.append(proxy)  # Add to dead proxies list
    except Exception:
        print(colored(f"{proxy} - DEAD (Connection failed)", 'red'))
        dead_proxies.append(proxy)  # Add to dead proxies list

# Check proxies concurrently with ThreadPoolExecutor
if proxies:
    with ThreadPoolExecutor(max_workers=20) as executor:
        executor.map(check_proxy, proxies)

    # Save live proxies to a file
    if live_proxies:
        with open('liveproxy.txt', 'w') as live_file:
            for proxy in live_proxies:
                live_file.write(proxy + '\n')
        print(f"Live proxies saved to liveproxy.txt ({len(live_proxies)} live proxies).")

    # Save dead proxies to a file
    if dead_proxies:
        with open('deadproxy.txt', 'w') as dead_file:
            for proxy in dead_proxies:
                dead_file.write(proxy + '\n')
        print(f"Dead proxies saved to deadproxy.txt ({len(dead_proxies)} dead proxies).")
else:
    print("No proxies found after scraping.")
