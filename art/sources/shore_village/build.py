from pathlib import Path
import sys
here=Path(__file__).resolve().parent
sys.path.insert(0,str(here.parent/'shore_shared'))
from shore import build
build(here.name,here)
