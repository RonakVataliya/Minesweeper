cmake_minimum_required(VERSION 3.10)
project(Minesweeper CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

add_executable(minesweeper_console
    backend/Game.cpp
    backend/Board.cpp
    backend/SaveManager.cpp
)
target_include_directories(minesweeper_console PRIVATE backend)

# -----------------------------------------------------------------------------
# This target builds the plain console demo with a normal system GCC/G++ and
# needs no extra tooling: cmake -B build && cmake --build build.
#
# The browser version (frontend/) is compiled from this same backend source
# with Emscripten instead of system GCC, exporting the Game class via Embind
# (see the EMSCRIPTEN_BINDINGS block in backend/Game.cpp). Build it with the
# Emscripten SDK active:
#
#   emcc backend/Game.cpp backend/Board.cpp backend/SaveManager.cpp \
#        -Ibackend -O2 -std=c++17 --bind \
#        -s MODULARIZE=1 -s EXPORT_NAME=createMinesweeperModule \
#        -s ALLOW_MEMORY_GROWTH=1 -lidbfs.js \
#        -o frontend/minesweeper.js
#
# That produces frontend/minesweeper.js + frontend/minesweeper.wasm, which
# frontend/app.js loads directly. See README.md for the full walkthrough.
# -----------------------------------------------------------------------------
