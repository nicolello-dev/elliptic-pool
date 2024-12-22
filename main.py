import pygame
from pygame.color import THECOLORS

# Initialize the game
pygame.init()

# Set up the screen
screen = pygame.display.set_mode((800, 600))

while True:
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            exit()

    # Clear the screen
    screen.fill(THECOLORS['black'])

    # Update the screen
    pygame.display.flip()