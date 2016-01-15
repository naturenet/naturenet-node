package org.naturenet.api.model

import java.time.LocalDateTime
import java.time.ZoneId
/**
 * Random value generation for creating the mock responses.
 */
class SampleValues {

    static final def RNG = new Random()

    /** see http://hipstum.io */
    private static final def HIPSTUM_TEXT =
"""
Salvia selvage godard, keffiyeh asymmetrical cray forage gastropub hella. Franzen humblebrag cold-pressed
tattooed 3 wolf moon hashtag dreamcatcher skateboard. Salvia health goth street art, retro kitsch semiotics
schlitz lomo. Cronut schlitz vegan wayfarers chillwave art party. Selvage chambray tilde four dollar toast
keffiyeh, messenger bag whatever 90's tote bag meggings etsy. Crucifix locavore mustache normcore. Craft
beer pop-up gastropub leggings hammock.

Next level portland +1, schlitz kinfolk thundercats gentrify kickstarter beard chartreuse 3 wolf moon.
Microdosing literally tumblr, banh mi tacos selvage cred flannel food truck four loko kombucha kickstarter
locavore messenger bag. Etsy celiac mustache sriracha pop-up. Freegan ramps flexitarian, selfies polaroid
seitan sartorial neutra salvia chicharrones paleo. Meh raw denim chambray roof party cold-pressed gastropub.
Pinterest health goth actually seitan, everyday carry ethical microdosing green juice yuccie direct trade. DIY
literally authentic, lo-fi before they sold out lomo kitsch green juice.

Lumbersexual art party meggings, drinking vinegar pop-up stumptown gluten-free trust fund. Banh mi put a bird
on it cornhole, kitsch godard sriracha hoodie hammock cred vice pitchfork. Heirloom try-hard fingerstache
lumbersexual lo-fi. Craft beer truffaut echo park thundercats VHS, selvage post-ironic. Offal PBR&B wolf,
chillwave ugh actually fingerstache health goth fixie neutra trust fund. Knausgaard YOLO truffaut kogi polaroid.
Narwhal distillery pabst, actually neutra intelligentsia meditation DIY blue bottle single-origin coffee VHS.

Intelligentsia ramps hella microdosing. Cardigan vice normcore, pop-up tofu ugh green juice blue bottle four
dollar toast skateboard. DIY swag four loko, quinoa squid typewriter crucifix VHS helvetica bicycle rights.
Leggings bitters photo booth +1 wayfarers lomo pitchfork chartreuse tumblr banjo, cornhole sriracha authentic
church-key. Cred trust fund XOXO tilde taxidermy fanny pack. Next level fingerstache keytar forage tote bag,
neutra hammock organic lomo try-hard 3 wolf moon. Echo park occupy stumptown tilde, mixtape sartorial photo
booth bespoke literally.
"""

    private static final def WORDS = HIPSTUM_TEXT.split("[,\\.\\s]").collect { it.trim() }.unique()

    private static final def TIME_ZONES = ZoneId.availableZoneIds.collect { ZoneId.of(it) }

    /**
     * @return a random word from the sample text.
     */
    static def word() {
        return WORDS[RNG.nextInt(WORDS.size())]
    }

    /**
     * @param words the number of words to return.
     * @return a string with containing the randomly chosen words.
     */
    static def stringOfWords(int words = 50) {
        def text = []
        words.times { text << word() }
        return text.join(" ")
    }

    /**
     * @param length the length of the string to return.
     * @return a string of the specified length.
     */
    static def stringOfLength(int length = 255) {
        def text = new StringBuilder()
        while (text.length() < length) {
            text << word()
        }
        return text.substring(0, length)
    }

    /**
     * @return a random timezone.
     */
    static def timeZone() {
        return TIME_ZONES[RNG.nextInt(TIME_ZONES.size())]
    }

    /**
     * @param offset the range, in seconds, to offset the date from the current time.
     * @return a random date
     */
    static def LocalDateTime date(int offset = 60 * 60 * 4) {
        def now = LocalDateTime.now(timeZone())
        if (RNG.nextBoolean()) {
            return now.minusSeconds(offset)
        } else {
            return now.plusSeconds(offset)
        }
    }

    /**
     * @return a random latitude/longitude pair as a two value list.
     */

    /**
     * Generates a random coordinate array centered at {@code [centerLat, centerLon]} and within a
     * square of side {@code radius}.
     *
     * NOTE: Using a square for the sample area instead of a circle (as radius would suggest) is
     *       to simplify the calculations here. Also phone screens are typically square so...
     *
     * @param centerLat the latitude of the center point.
     * @param centerLon the longitude of the cetner point.
     * @param radius the radius within which to generate a point.
     * @return a random latitude/longitude pair within the bounds.
     */
    static def List coordinates(float centerLat, float centerLon, float radius) {
        float latOffset = kilometersToLatitude(floatInRange(-radius, radius))
        float lat = centerLat + kilometersToLatitude(latOffset)
        float lonOffset = kilometersToLongitude(floatInRange(-radius, radius), lat)
        float lon = centerLon + lonOffset
        return [lat, lon]
    }

    // reference for below conversions:
    // http://stackoverflow.com/questions/1253499/simple-calculations-for-working-with-lat-lon-km-distance

    /**
     * Converts a distance in kilometers into an approximate latitude offset.
     *
     * @param km the distance in kilometers to convert.
     * @return an approximation of the distance as latitude degrees.
     */
    private static def float kilometersToLatitude(float km) {
        return km / 110.574f
    }

    /**
     * Converts a distance in kilometers into an approximate longitude offset at a
     * certain latitude.
     *
     * @param km the distance in kilometers to convert.
     * @param latitude the latitude at which the conversion is occurring.
     * @return an approximation of the distance as longitude degrees.
     */
    private static def float kilometersToLongitude(float km, float latitude) {
        return 111.320f * Math.cos(Math.toRadians(latitude)) * km
    }

    private static def float floatInRange(float min, float max) {
        float range = max - min
        float scaled = RNG.nextFloat() * range
        return scaled + min
    }
}
