#!/bin/bash
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if command_exists mprocs; then
  mprocs -c mprocs.yml
else
  echo "mprocs is not available. Please install it."
  echo "Installation instructions can be found here: https://github.com/pvolok/mprocs#installation"
fi