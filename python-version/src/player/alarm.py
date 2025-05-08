from socket import socket
from socket import AF_INET, SOCK_DGRAM

RELAY_IP = "192.168.1.100"
RELAY_PORT = 6723

def alarm_relay1_on(): # сирена
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "11"
    request = bytes(relay_command, "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()

def alarm_relay2_on(): # лампа
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "12"
    request = bytes(relay_command, "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()
    
def alarm_relay1_off(): # сирена
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "21"
    request = bytes(relay_command, "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()

def alarm_relay2_off(): # лампа
    fd = socket(AF_INET, SOCK_DGRAM)    
    relay_command = "22"
    request = bytes(relay_command, "ascii")
    fd.sendto(request, (RELAY_IP, RELAY_PORT))
    fd.close()

def alarm_relay_reset():
    alarm_relay1_off()
    alarm_relay2_off()
