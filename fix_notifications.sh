#!/bin/bash

# Fix malformed notification calls
cd client/src

# Fix files with malformed showNotification calls
for file in components/wallet/*.tsx components/missions/*.tsx components/farming/*.tsx; do
  if [ -f "$file" ]; then
    # Fix malformed object syntax created by sed
    sed -i 's/showNotification({$/showNotification({/g' "$file"
    sed -i 's/showNotification({ {/showNotification({/g' "$file"
    sed -i 's/showNotification({type: '\''loading'\'', {/showNotification({ type: '\''loading'\'',/g' "$file"
    sed -i 's/showNotification({type: '\''success'\'', {/showNotification({ type: '\''success'\'',/g' "$file"
    sed -i 's/showNotification({type: '\''error'\'', {/showNotification({ type: '\''error'\'',/g' "$file"
    sed -i 's/showNotification({type: '\''info'\'', {/showNotification({ type: '\''info'\'',/g' "$file"
    
    # Ensure proper object structure
    sed -i '/showNotification({/{
      N
      s/showNotification({\n[[:space:]]*message:/showNotification({\n  message:/g
    }' "$file"
  fi
done

echo "Fixed notification calls"