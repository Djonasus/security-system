from socket import socket
from socket import AF_INET, SOCK_DGRAM

RELAY_IP = "192.168.1.20"
RELAY_PORT = 8283

LOGIN = "admin"
PASSWORD = "admin"

__is_alarm_on = False

def alarm_relay1_on(): # лампа
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "k1=1"
    request = bytes(f"{LOGIN} {PASSWORD} {relay_command}", "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()

def alarm_relay2_on(): # сирена
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "k2=1"
    request = bytes(f"{LOGIN} {PASSWORD} {relay_command}", "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()
    
def alarm_relay1_off(): # лампа
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "k1=0"
    request = bytes(f"{LOGIN} {PASSWORD} {relay_command}", "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()

def alarm_relay2_off(): # сирена
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "k2=0"
    request = bytes(f"{LOGIN} {PASSWORD} {relay_command}", "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()
