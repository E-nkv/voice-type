#!/bin/bash
# install.sh - wraith installation script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing wraith Speech-to-Text Daemon${NC}"

# Download latest binary
echo -e "${GREEN}Downloading wraith binary...${NC}"
LATEST_URL="https://github.com/E-nkv/wraith/releases/latest/download/wraith-linux-x64"
curl -L -o /tmp/wraith "$LATEST_URL"
chmod +x /tmp/wraith

# Download assets (sounds)
echo -e "${GREEN}Downloading sound assets...${NC}"
ASSETS_DIR="/usr/local/share/wraith"
sudo mkdir -p "$ASSETS_DIR/sounds"
curl -L -o /tmp/sounds.tar.gz "https://github.com/E-nkv/wraith/releases/latest/download/sounds.tar.gz"
sudo tar -xzf /tmp/sounds.tar.gz -C "$ASSETS_DIR/sounds"

# Install binary
echo -e "${GREEN}Installing binary to /usr/local/bin...${NC}"
sudo mv /tmp/wraith /usr/local/bin/wraith


# Check for system dependencies
MISSING_DEPS=()

if ! command -v dotool >/dev/null 2>&1; then
    MISSING_DEPS+=("dotool")
fi

if ! command -v notify-send >/dev/null 2>&1; then
    MISSING_DEPS+=("libnotify")
fi

if ! command -v paplay >/dev/null 2>&1; then
    MISSING_DEPS+=("pulseaudio-utils")
fi

if ! command -v google-chrome >/dev/null 2>&1 && ! command -v google-chrome-stable >/dev/null 2>&1; then
    MISSING_DEPS+=("Google Chrome")
fi

if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
    echo -e "${GREEN}All system dependencies are already installed!${NC}"
    echo -e "${GREEN}Installation complete!${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}The following system dependencies are missing:${NC}"
for dep in "${MISSING_DEPS[@]}"; do
    echo "  - $dep"
done
echo ""
echo -e "${GREEN}Attempting to install missing dependencies...${NC}"

# Detect distribution
if [ -f /etc/arch-release ]; then
    DISTRO="arch"
elif [ -f /etc/debian_version ]; then
    DISTRO="debian"
elif [ -f /etc/fedora-release ]; then
    DISTRO="fedora"
else
    echo -e "${YELLOW}Warning: Unsupported distribution. Attempting generic installation.${NC}"
    DISTRO="generic"
fi

# Install system dependencies
case $DISTRO in
    "arch")
        # Check for AUR helper
        if command -v yay >/dev/null 2>&1; then
            AUR_HELPER="yay"
        elif command -v paru >/dev/null 2>&1; then
            AUR_HELPER="paru"
        else
            echo -e "${RED}Error: No AUR helper found (yay or paru).${NC}"
            echo ""
            echo -e "${YELLOW}wraith requires dotool and google-chrome from the AUR.${NC}"
            echo ""
            echo "Please install an AUR helper first:"
            echo ""
            echo "  Option 1 - Install yay:"
            echo "    sudo pacman -S --needed git base-devel"
            echo "    git clone https://aur.archlinux.org/yay.git /tmp/yay"
            echo "    cd /tmp/yay && makepkg -si"
            echo ""
            echo "  Option 2 - Install paru:"
            echo "    sudo pacman -S --needed git base-devel"
            echo "    git clone https://aur.archlinux.org/paru.git /tmp/paru"
            echo "    cd /tmp/paru && makepkg -si"
            echo ""
            echo "After installing an AUR helper, run this script again."
            exit 1
        fi
        
        # Install official packages first
        # Check if paplay is already available (could be from pulseaudio or pipewire-pulse)
        if ! command -v paplay >/dev/null 2>&1; then
            # paplay not found, try to install pulseaudio
            # Note: This may conflict with pipewire-pulse on modern Arch systems
            echo -e "${YELLOW}paplay not found. Attempting to install pulseaudio...${NC}"
            sudo pacman -S --needed --noconfirm libnotify pulseaudio 2>/dev/null || {
                echo -e "${YELLOW}pulseaudio installation failed (likely due to pipewire-pulse conflict).${NC}"
                echo -e "${YELLOW}If you're using PipeWire, paplay should already be available.${NC}"
            }
        else
            # paplay is available, just install libnotify
            sudo pacman -S --needed --noconfirm libnotify
        fi
        
        $AUR_HELPER -S --needed --removemake --noconfirm dotool google-chrome
        
        # Check if dotool was installed successfully
        if ! command -v dotool >/dev/null 2>&1; then
            echo -e "${RED}Failed to install dotool. Please install it manually:${NC}"
            echo "  $AUR_HELPER -S dotool"
            exit 1
        fi
        ;;
    "debian"|"ubuntu")
        sudo apt update
        sudo apt install -y dotool libnotify-bin pulseaudio-utils google-chrome-stable
        ;;
    "fedora")
        sudo dnf install -y dotool libnotify pulseaudio-utils google-chrome-stable
        ;;
    *)
        echo -e "${YELLOW}Please manually install:${NC}"
        echo "  - dotool (Wayland virtual input)"
        echo "  - libnotify (desktop notifications)"
        echo "  - pulseaudio-utils (paplay for sound)"
        echo "  - Google Chrome (for Web Speech API)"
        ;;
esac

echo -e "${GREEN}System dependencies installation complete!${NC}"
echo -e "${GREEN}Installation complete!${NC}"
