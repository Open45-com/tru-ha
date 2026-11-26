from pathlib import Path
import sys
sd=Path(__file__).resolve().parent
sys.path.insert(0,str(sd.parent/'dock_shared'))
from docks import build
build(sd.name,sd)
