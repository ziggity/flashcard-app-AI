import requests
from urllib.request import urlopen
html = requests.urlopen("http://pythonscraping.com/pages/warandpeace.html")

print(html.read())