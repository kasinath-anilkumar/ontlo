import { useEffect, useState } from "react";
import { Globe, Loader2, MapPin } from "lucide-react";

const LocationAutocomplete = ({ value, onChange, isEditing = true, label = "Location", placeholder = "Type your city..." }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (!query || query.length < 3 || !isEditing) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
        const data = await response.json();
        
        const results = data.map(item => {
          const addr = item.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality;
          const state = addr.state;
          const country = addr.country;
          
          const name = city ? `${city}${state ? ', ' + state : ''}${country ? ', ' + country : ''}` : item.display_name.split(',').slice(0, 3).join(',');

          return {
            name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          };
        });
        
        // Remove duplicates based on name
        const uniqueResults = results.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        
        setSuggestions(uniqueResults);
        setIsOpen(true);
      } catch (err) {
        console.error("Error fetching locations:", err);
      } finally {
        setIsLoading(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [query, isEditing]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // Only clear coords if we are actually typing a NEW location
    onChange(val, null, null); 
  };

  const handleSelect = (city) => {
    setQuery(city.name);
    onChange(city.name, city.lat, city.lon);
    setIsOpen(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">{label}</label>
        <div className="bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm shadow-inner truncate">
          {value || "Not set"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-400 transition-colors">
          <Globe className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 250)}
          className="w-full bg-[#151923] border border-[#1e293b] text-white rounded-2xl pl-12 pr-12 py-3 focus:outline-none focus:border-purple-500/50 transition-all text-sm font-semibold placeholder:text-gray-700"
          placeholder={placeholder}
          required
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          </div>
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-[100%] left-0 right-0 mt-2 bg-[#151923] border border-[#1e293b] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {suggestions.map((city) => (
            <div
              key={city.name}
              onClick={() => handleSelect(city)}
              className="px-5 py-3 hover:bg-white/5 cursor-pointer text-xs font-bold text-white transition-colors border-b border-[#1e293b] last:border-0 flex items-center gap-3"
            >
              <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span className="truncate">{city.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
