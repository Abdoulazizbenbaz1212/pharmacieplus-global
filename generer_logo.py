from PIL import Image, ImageDraw

taille = 1024
img = Image.new('RGBA', (taille, taille), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Fond degrade simule (cercle plein rouge)
couleur_fond = (231, 76, 60, 255)  # #e74c3c
draw.ellipse([0, 0, taille, taille], fill=couleur_fond)

# Croix medicale blanche au centre
marge = taille * 0.28
epaisseur = taille * 0.16
centre = taille / 2

# Barre verticale
draw.rounded_rectangle(
    [centre - epaisseur/2, marge, centre + epaisseur/2, taille - marge],
    radius=epaisseur/4, fill=(255, 255, 255, 255)
)
# Barre horizontale
draw.rounded_rectangle(
    [marge, centre - epaisseur/2, taille - marge, centre + epaisseur/2],
    radius=epaisseur/4, fill=(255, 255, 255, 255)
)

img.save('assets/icon.png')
img.save('assets/adaptive-icon.png')

# Favicon (plus petit)
favicon = img.resize((196, 196), Image.LANCZOS)
favicon.save('assets/favicon.png')

# Splash screen (fond blanc uni avec logo au centre, plus petit)
splash = Image.new('RGBA', (1284, 2778), (255, 255, 255, 255))
logo_splash = img.resize((400, 400), Image.LANCZOS)
pos_x = (1284 - 400) // 2
pos_y = (2778 - 400) // 2
splash.paste(logo_splash, (pos_x, pos_y), logo_splash)
splash.save('assets/splash.png')

print("Logo genere avec succes dans assets/")

# Foreground : croix blanche sur fond transparent (pour l'icone adaptative Android)
foreground = Image.new('RGBA', (taille, taille), (0, 0, 0, 0))
draw_fg = ImageDraw.Draw(foreground)
draw_fg.rounded_rectangle(
    [centre - epaisseur/2, marge, centre + epaisseur/2, taille - marge],
    radius=epaisseur/4, fill=(255, 255, 255, 255)
)
draw_fg.rounded_rectangle(
    [marge, centre - epaisseur/2, taille - marge, centre + epaisseur/2],
    radius=epaisseur/4, fill=(255, 255, 255, 255)
)
foreground.save('assets/android-icon-foreground.png')

# Background : fond rouge uni
background = Image.new('RGBA', (taille, taille), couleur_fond)
background.save('assets/android-icon-background.png')

# Monochrome : croix en niveaux de gris/blanc sur transparent (meme forme que foreground)
foreground.save('assets/android-icon-monochrome.png')

print("Icones Android adaptatives regenerees")
