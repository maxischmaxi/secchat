#!/usr/bin/env bash
# secchat VM Hardening — einmaliges Setup, idempotent.
#
# WARNUNG: Dieses Script aktiviert ufw und setzt SSH auf Key-only.
# Empfehlung: zweite SSH-Session offen lassen, falls etwas klemmt.
# Die sshd-Config wird vor dem Reload mit `sshd -t` validiert.
#
# Usage (auf der VM):
#   bash /tmp/harden-server.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "muss als root laufen" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[+] apt update + Pakete installieren"
apt-get update -qq
apt-get install -y -qq \
  ufw fail2ban unattended-upgrades apparmor apparmor-utils >/dev/null

echo "[+] ufw: deny incoming, allow outgoing, SSH offen"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp comment 'SSH' >/dev/null
ufw --force enable >/dev/null

echo "[+] SSH hardening (key-only)"
install -m 0644 /dev/stdin /etc/ssh/sshd_config.d/99-secchat-hardening.conf <<'SSHCONF'
# secchat hardening (managed by scripts/harden-server.sh)
PasswordAuthentication no
PermitRootLogin prohibit-password
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2
AllowAgentForwarding no
AllowTcpForwarding no
AuthenticationMethods publickey
SSHCONF
sshd -t
systemctl reload ssh

echo "[+] sysctl hardening"
install -m 0644 /dev/stdin /etc/sysctl.d/99-secchat-hardening.conf <<'SYSCTL'
# Netzwerk
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.default.accept_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv6.conf.default.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.default.send_redirects=0
net.ipv4.conf.all.accept_source_route=0
net.ipv4.conf.default.accept_source_route=0
net.ipv6.conf.all.accept_source_route=0
net.ipv6.conf.default.accept_source_route=0
net.ipv4.icmp_echo_ignore_broadcasts=1
net.ipv4.icmp_ignore_bogus_error_responses=1
net.ipv4.conf.all.log_martians=1
# Kernel
kernel.kptr_restrict=2
kernel.dmesg_restrict=1
kernel.randomize_va_space=2
fs.protected_hardlinks=1
fs.protected_symlinks=1
fs.protected_fifos=2
fs.protected_regular=2
SYSCTL
sysctl --system >/dev/null

echo "[+] fail2ban (SSH-Jail)"
install -m 0644 /dev/stdin /etc/fail2ban/jail.d/secchat-sshd.local <<'F2B'
[sshd]
enabled  = true
mode     = aggressive
maxretry = 3
findtime = 10m
bantime  = 1h
F2B
systemctl enable --now fail2ban >/dev/null

echo "[+] unattended-upgrades (Security only)"
install -m 0644 /dev/stdin /etc/apt/apt.conf.d/20auto-upgrades <<'UA'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
UA
systemctl enable --now unattended-upgrades >/dev/null

echo "[+] AppArmor sicherstellen"
systemctl is-active --quiet apparmor || systemctl enable --now apparmor

echo "[+] Zeit-Sync aktiv"
timedatectl set-ntp true

echo "[+] Swap (falls noch keiner existiert)"
if [ "$(swapon --show --noheadings | wc -l)" = "0" ]; then
  SIZE_MB=$(free -m | awk '/^Mem:/ { print $2 }')
  SWAP_MB=$((SIZE_MB / 2))
  [ "$SWAP_MB" -gt 4096 ] && SWAP_MB=4096
  fallocate -l "${SWAP_MB}M" /swapfile
  chmod 600 /swapfile
  mkswap -q /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    Swap ${SWAP_MB}M aktiviert"
else
  echo "    Swap bereits aktiv"
fi

echo "[+] Docker-Ressourcen-Check (keine Limits gesetzt)"
systemctl show docker --property=MemoryMax,CPUQuota,TasksMax | sed 's/^/    /'
docker info --format '    NCPU={{.NCPU}} MemTotal={{.MemTotal}}'

echo
echo "[OK] Hardening abgeschlossen."
echo "Quick-Checks:"
echo "  ufw status verbose"
echo "  systemctl status fail2ban ssh"
echo "  sshd -T | grep -E 'passwordauth|permitroot|authenticationmethods'"
echo "  docker info | head -40"
echo "  free -h"
