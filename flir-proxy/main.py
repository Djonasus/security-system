import flyr

flir_path = "thermograms/flir_e5_2.jpg"
thermogram = flyr.unpack(flir_path)
optical_arr = thermogram.optical  # Also works
thermogram.optical_pil.save("optical.jpg")