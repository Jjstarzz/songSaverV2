'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Music2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type ImportSong = {
  title: string
  artist?: string
  default_key?: string
  mode?: 'major' | 'minor'
}

// All unique songs parsed from the worship library PDF, ordered by first key occurrence.
// Duplicates resolved by keeping the first occurrence.
const SONGS: ImportSong[] = [
  // ── No key ──
  { title: 'Set a Fire' },
  { title: 'Make Room' },
  { title: 'Great Is Your Faithfulness', artist: 'Martin Smith' },
  { title: 'Open My Eyes Lord' },
  { title: 'What a Friend We Have in Jesus' },
  { title: 'Lord You Are More Precious Than Silver' },
  { title: 'And I Will Run the Race Till I See Your Face' },
  { title: 'Forever Reign', artist: 'Hillsong' },
  { title: 'Your Grace Is Enough' },
  { title: 'Came to My Rescue' },
  { title: 'Vishvasthanai Irrika' },
  { title: 'Happy Days' },
  { title: 'Such an Awesome God' },
  { title: "I'm Trading My Sorrows" },
  { title: 'I Will Wait for You' },
  { title: 'None but Jesus', artist: 'Hillsong' },
  { title: 'Yeshu Mathram Mathi' },
  { title: 'Jesus Be Enthroned', artist: 'Don Moen' },
  { title: 'Let Your Living Water Flow Over My Soul' },
  { title: 'Wonderful Merciful Saviour' },
  { title: 'New Name Written Down in Glory' },
  { title: 'Christ Our Glory' },
  { title: 'Alpha Omega' },
  { title: 'Resurrecting', artist: 'Elevation Worship' },
  { title: 'Draw Me Close to You' },
  { title: 'In Your Presence That\'s Where I Belong' },
  { title: 'Nithya Snehathal' },
  { title: 'Dinavum' },
  { title: 'Ente Ishtangal Onnume Venda Yeshuve' },
  { title: 'Enne Rekshippan' },
  { title: 'Ithupollil Oru Pagyam' },
  { title: 'All My Ways Are Known to You' },
  { title: 'Let the Heavens Open', artist: 'Gateway' },
  { title: 'Consume Me with Your Fire', artist: 'Hungry Gen' },
  { title: 'Come Holy Spirit', artist: 'Martin Smith' },
  { title: 'Come Holy Spirit Fall on Us Burn Like a Fire' },
  { title: 'Spirit of God Breathe on Me' },

  // ── A major ──
  { title: 'Living Hope', default_key: 'A', mode: 'major' },
  { title: 'Jesus Your Mercy', artist: 'Sovereign Grace', default_key: 'A', mode: 'major' },
  { title: 'Here in Your Presence', default_key: 'A', mode: 'major' },
  { title: 'When Christ Our Life Appears', default_key: 'A', mode: 'major' },
  { title: 'When We All Get to Heaven', default_key: 'A', mode: 'major' },
  { title: 'Beautiful One', default_key: 'A', mode: 'major' },
  { title: 'Show Me Your Face Lord', default_key: 'A', mode: 'major' },
  { title: 'All Is for Your Glory', default_key: 'A', mode: 'major' },
  { title: 'My Heart Will Sing No Other Name', default_key: 'A', mode: 'major' },
  { title: 'Yahweh Will Manifest Himself', default_key: 'A', mode: 'major' },

  // ── A# major ──
  { title: 'Who Am I', default_key: 'A#', mode: 'major' },
  { title: 'Shout to the Lord', default_key: 'A#', mode: 'major' },
  { title: 'Goodness of God', default_key: 'A#', mode: 'major' },
  { title: 'Marvelous', artist: 'Mitch Wong', default_key: 'A#', mode: 'major' },
  { title: 'Still', default_key: 'A#', mode: 'major' },
  { title: "We Won't Bow Down", artist: 'Victory House', default_key: 'A#', mode: 'major' },
  { title: 'Adonai', artist: 'Paul Wilbur', default_key: 'A#', mode: 'major' },
  { title: 'This Is How We Overcome', default_key: 'A#', mode: 'major' },

  // ── G minor ──
  { title: 'Make Me a House of Prayer', default_key: 'G', mode: 'minor' },

  // ── B major ──
  { title: 'I Desire Jesus', artist: 'Hillsong', default_key: 'B', mode: 'major' },
  { title: 'You Deserve the Glory', default_key: 'B', mode: 'major' },
  { title: 'Covered by Your Grace', default_key: 'B', mode: 'major' },
  { title: 'Glorious Day', default_key: 'B', mode: 'major' },
  { title: 'We Want Revival Now', default_key: 'B', mode: 'major' },
  { title: 'Jesus Loves Me This I Know', default_key: 'B', mode: 'major' },
  { title: 'When I Look Into Your Holiness', default_key: 'B', mode: 'major' },
  { title: 'In Christ Alone', default_key: 'B', mode: 'major' },
  { title: 'Praise', artist: 'Elevation Worship', default_key: 'B', mode: 'major' },
  { title: 'Reckless Love', default_key: 'B', mode: 'major' },
  { title: 'Glorify Thy Name', default_key: 'B', mode: 'major' },
  { title: 'I Will Rise', artist: 'Hillsong', default_key: 'B', mode: 'major' },
  { title: 'Great I Am', default_key: 'B', mode: 'major' },
  { title: 'Change My Heart Oh God', default_key: 'B', mode: 'major' },
  { title: 'I Surrender', artist: 'Hillsong', default_key: 'B', mode: 'major' },
  { title: 'Amen', artist: 'Ria Alexander', default_key: 'B', mode: 'major' },
  { title: 'God Is So Good', artist: 'Passion', default_key: 'B', mode: 'major' },
  { title: 'Yahweh Is Coming', default_key: 'B', mode: 'major' },
  { title: 'Lift Up Holy Hands', default_key: 'B', mode: 'major' },
  { title: 'Ancient of Days', artist: 'City Alight', default_key: 'B', mode: 'major' },
  { title: 'As the Deer', default_key: 'B', mode: 'major' },
  { title: 'Stir a Passion in My Heart', default_key: 'B', mode: 'major' },
  { title: 'Our King Will Come', default_key: 'B', mode: 'major' },
  { title: 'Jesus Paid It All', default_key: 'B', mode: 'major' },
  { title: 'Is He Worthy', default_key: 'B', mode: 'major' },

  // ── G# minor ──
  { title: 'Give Him Reverence - The King Is in the Room', default_key: 'G#', mode: 'minor' },
  { title: 'Unto the Lamb', artist: "David's Tent", default_key: 'G#', mode: 'minor' },
  { title: 'Lion', artist: 'Elevation Worship', default_key: 'G#', mode: 'minor' },
  { title: 'Tremble', default_key: 'G#', mode: 'minor' },

  // ── C major ──
  { title: 'Blessing and Honour', default_key: 'C', mode: 'major' },
  { title: 'He Is Faithful', default_key: 'C', mode: 'major' },
  { title: 'I Lift My Hands Up', default_key: 'C', mode: 'major' },
  { title: 'Father We Love You', default_key: 'C', mode: 'major' },
  { title: 'Blessed Assurance', default_key: 'C', mode: 'major' },
  { title: 'He Is Lord', artist: 'Hillsong', default_key: 'C', mode: 'major' },
  { title: 'Hope Has a Name', default_key: 'C', mode: 'major' },
  { title: 'What Love My God', default_key: 'C', mode: 'major' },
  { title: 'There Is a Redeemer', default_key: 'C', mode: 'major' },
  { title: 'God I Look to You', default_key: 'C', mode: 'major' },
  { title: 'Worthy', artist: 'Elevation Worship', default_key: 'C', mode: 'major' },
  { title: 'I Exalt Thee', default_key: 'C', mode: 'major' },
  { title: 'Back to Life', default_key: 'C', mode: 'major' },
  { title: 'God Is Good All the Time', default_key: 'C', mode: 'major' },

  // ── A minor ──
  { title: 'You Are My Hiding Place', default_key: 'A', mode: 'minor' },
  { title: 'Spirit of the Sovereign Lord', default_key: 'A', mode: 'minor' },

  // ── D major ──
  { title: 'With All I Am', artist: 'Hillsong', default_key: 'D', mode: 'major' },
  { title: 'Man of Sorrows', default_key: 'D', mode: 'major' },
  { title: 'No Longer Slaves', default_key: 'D', mode: 'major' },
  { title: 'In Control', default_key: 'D', mode: 'major' },
  { title: 'Yet Not I but Through Christ in Me', default_key: 'D', mode: 'major' },
  { title: 'Desert Song', default_key: 'D', mode: 'major' },
  { title: 'Only a Holy God', default_key: 'D', mode: 'major' },
  { title: 'Good and Gracious King', default_key: 'D', mode: 'major' },
  { title: 'Forever I\'ll Sing Praises to You', default_key: 'D', mode: 'major' },
  { title: 'Bless the Lord / 10000 Reasons', default_key: 'D', mode: 'major' },
  { title: 'Hosanna', artist: 'Hillsong', default_key: 'D', mode: 'major' },
  { title: 'Lord I Offer My Life to You', default_key: 'D', mode: 'major' },
  { title: 'Cornerstone', artist: 'Hillsong', default_key: 'D', mode: 'major' },
  { title: 'Raise a Hallelujah', default_key: 'D', mode: 'major' },
  { title: 'A Shield About Me', default_key: 'D', mode: 'major' },
  { title: 'Here I Am to Worship', artist: 'Hillsong', default_key: 'D', mode: 'major' },
  { title: 'Build My Life', default_key: 'D', mode: 'major' },
  { title: 'Turn Your Eyes Upon Jesus', default_key: 'D', mode: 'major' },
  { title: 'Your Promises Never Fail', default_key: 'D', mode: 'major' },
  { title: 'Beautiful Name', default_key: 'D', mode: 'major' },
  { title: 'Firm Foundation', default_key: 'D', mode: 'major' },
  { title: 'This Is Amazing Grace', default_key: 'D', mode: 'major' },
  { title: 'Better Is One Day', default_key: 'D', mode: 'major' },
  { title: 'Lord You Are Good and Your Mercy Endureth Forever', default_key: 'D', mode: 'major' },
  { title: 'Give Me Joy in My Heart', default_key: 'D', mode: 'major' },
  { title: 'Open the Eyes of My Heart Lord', default_key: 'D', mode: 'major' },
  { title: 'In Jesus\' Name', artist: 'Darlene Zschech', default_key: 'D', mode: 'major' },
  { title: 'In the Name of Jesus We Have the Victory', default_key: 'D', mode: 'major' },
  { title: 'What a Mighty God We Serve', default_key: 'D', mode: 'major' },
  { title: 'Washed', default_key: 'D', mode: 'major' },
  { title: 'Lion and the Lamb', default_key: 'D', mode: 'major' },
  { title: 'He Has Done Great Things', default_key: 'D', mode: 'major' },
  { title: "What My Father's Like", default_key: 'D', mode: 'major' },
  { title: 'Run to the Father', default_key: 'D', mode: 'major' },
  { title: 'Jesus Be the Name', default_key: 'D', mode: 'major' },
  { title: 'He Is My Everything He Is My All', default_key: 'D', mode: 'major' },
  { title: 'I Can Only Imagine', artist: 'Mercy Culture', default_key: 'D', mode: 'major' },
  { title: 'Hosanna (Hillsong Worship)', default_key: 'D', mode: 'major' },
  { title: 'Lord I Offer My Life to You', default_key: 'D', mode: 'major' },

  // ── B minor ──
  { title: 'To Break Every Chain', default_key: 'B', mode: 'minor' },

  // ── D# major ──
  { title: 'I Thank God', artist: 'Maverick City', default_key: 'D#', mode: 'major' },
  { title: 'What an Awesome God', artist: 'Phil Wickham', default_key: 'D#', mode: 'major' },
  { title: 'You Are the God That Healeth Me', default_key: 'D#', mode: 'major' },
  { title: 'Welcome Holy Spirit', default_key: 'D#', mode: 'major' },

  // ── C minor ──
  { title: 'Consume Me', artist: 'Hungry Gen', default_key: 'C', mode: 'minor' },
  { title: 'Break Every Chain', default_key: 'C', mode: 'minor' },

  // ── E major ──
  { title: 'Lily of the Valley', default_key: 'E', mode: 'major' },
  { title: 'Emmanuel', artist: 'Hillsong', default_key: 'E', mode: 'major' },
  { title: 'What a Beautiful Name', default_key: 'E', mode: 'major' },
  { title: 'Here for You', artist: 'Matt Redman', default_key: 'E', mode: 'major' },
  { title: 'Good Good Father', default_key: 'E', mode: 'major' },
  { title: 'Worthy of It All', default_key: 'E', mode: 'major' },
  { title: 'Nothing but the Blood', default_key: 'E', mode: 'major' },
  { title: 'Great Are You Lord', default_key: 'E', mode: 'major' },
  { title: 'Narrow Way', default_key: 'E', mode: 'major' },
  { title: 'I Will Boast in Christ Alone', default_key: 'E', mode: 'major' },
  { title: 'One Thing Remains', default_key: 'E', mode: 'major' },
  { title: 'I Speak Jesus', default_key: 'E', mode: 'major' },
  { title: 'King of Kings', artist: 'Brooke Ligertwood', default_key: 'E', mode: 'major' },
  { title: 'Every Praise Is to Our God', default_key: 'E', mode: 'major' },
  { title: "Jesus You're Beautiful", default_key: 'E', mode: 'major' },
  { title: 'Never Once', artist: 'Matt Redman', default_key: 'E', mode: 'major' },
  { title: 'More Precious Than Silver', default_key: 'E', mode: 'major' },
  { title: 'Been So Good', default_key: 'E', mode: 'major' },
  { title: 'See a Victory', default_key: 'E', mode: 'major' },
  { title: 'Whom Shall I Fear', default_key: 'E', mode: 'major' },
  { title: 'It Was Finished Upon That Cross', artist: 'City Alight', default_key: 'E', mode: 'major' },
  { title: 'Who You Say I Am', default_key: 'E', mode: 'major' },
  { title: 'Draw Me Nearer', default_key: 'E', mode: 'major' },
  { title: "Purify My Heart (Refiner's Fire)", default_key: 'E', mode: 'major' },
  { title: 'Amazing Grace', default_key: 'E', mode: 'major' },
  { title: 'All Hail King Jesus', default_key: 'E', mode: 'major' },
  { title: 'O Come to the Altar', default_key: 'E', mode: 'major' },
  { title: "How Great the Father's Love for Us", default_key: 'E', mode: 'major' },
  { title: 'Through It All', default_key: 'E', mode: 'major' },
  { title: 'Joy (What the World Calls Foolish)', default_key: 'E', mode: 'major' },
  { title: "I've Got the Joy Joy Joy Down in My Heart", default_key: 'E', mode: 'major' },
  { title: 'My Redeemer Lives', default_key: 'E', mode: 'major' },
  { title: 'Come Rest on Us', default_key: 'E', mode: 'major' },
  { title: 'One Way Jesus', default_key: 'E', mode: 'major' },
  { title: 'My Life Is in You Lord My Strength', default_key: 'E', mode: 'major' },
  { title: 'Tis So Sweet to Trust in Jesus', default_key: 'E', mode: 'major' },
  { title: 'Holy and Anointed One', default_key: 'E', mode: 'major' },
  { title: 'Yes I Will', default_key: 'E', mode: 'major' },
  { title: 'Our God Reigns', default_key: 'E', mode: 'major' },
  { title: 'Forever', artist: 'Kari Jobe', default_key: 'E', mode: 'major' },
  { title: 'Amen Bridge', default_key: 'E', mode: 'major' },

  // ── C# minor ──
  { title: 'Every Other God Is an Idol', default_key: 'C#', mode: 'minor' },
  { title: 'You Are My Refuge', default_key: 'C#', mode: 'minor' },
  { title: 'The Name of the Lord Is My Strong Tower', default_key: 'C#', mode: 'minor' },

  // ── F major ──
  { title: 'High and Lifted Up', default_key: 'F', mode: 'major' },
  { title: 'Jesus Lamb of God', default_key: 'F', mode: 'major' },
  { title: 'I Want Jesus More Than Anything', default_key: 'F', mode: 'major' },
  { title: 'Lord I Need You', default_key: 'F', mode: 'major' },
  { title: 'Give Thanks', default_key: 'F', mode: 'major' },
  { title: 'I Came for You', artist: 'Kristian Standfill', default_key: 'F', mode: 'major' },
  { title: 'He Is Exalted', default_key: 'F', mode: 'major' },
  { title: 'God the Uncreated One', default_key: 'F', mode: 'major' },
  { title: 'Our God Is Greater', default_key: 'F', mode: 'major' },
  { title: 'For All You\'ve Done', default_key: 'F', mode: 'major' },
  { title: 'This Is Your House', artist: 'Don Moen', default_key: 'F', mode: 'major' },
  { title: 'Joy', artist: 'Belonging Co', default_key: 'F', mode: 'major' },
  { title: 'There Is Power in the Blood of the Lamb', default_key: 'F', mode: 'major' },
  { title: 'I Believe', artist: 'Phil Wickham', default_key: 'F', mode: 'major' },
  { title: 'All Heaven Declares', default_key: 'F', mode: 'major' },
  { title: 'Great Is the Lord and Most Worthy of Praise', default_key: 'F', mode: 'major' },
  { title: 'Saviour He Can Move the Mountains', default_key: 'F', mode: 'major' },
  { title: 'Christ Is Enough', default_key: 'F', mode: 'major' },
  { title: 'The Anthem', artist: 'Planetshakers', default_key: 'F', mode: 'major' },
  { title: 'Lord I Lift Your Name on High', default_key: 'F', mode: 'major' },
  { title: 'Tell the World That Jesus Lives', default_key: 'F', mode: 'major' },
  { title: 'I Sing Praises to Your Name', default_key: 'F', mode: 'major' },
  { title: 'Forever He Is Glorified', default_key: 'F', mode: 'major' },
  { title: 'Give Me Jesus', artist: 'UPPERroom', default_key: 'F', mode: 'major' },
  { title: 'You Remain', default_key: 'F', mode: 'major' },
  { title: 'I See Heaven', default_key: 'F', mode: 'major' },
  { title: 'Oh Come Let Us Adore Him', default_key: 'F', mode: 'major' },
  { title: 'Mighty Name of Jesus', default_key: 'F', mode: 'major' },
  { title: 'Our Father (All of Heaven Roars Your Name)', default_key: 'F', mode: 'major' },
  { title: 'Hallelujah Hosanna', default_key: 'F', mode: 'major' },
  { title: 'Uyirode Ellunthavare', default_key: 'F', mode: 'major' },
  { title: 'O Death You Have Lost Your Sting', default_key: 'F', mode: 'major' },
  { title: 'Way Maker', default_key: 'F', mode: 'major' },
  { title: 'You Saved Me', default_key: 'F', mode: 'major' },
  { title: 'His Glory and My Good', default_key: 'F', mode: 'major' },

  // ── D minor ──
  { title: 'Yeshua My Beloved', default_key: 'D', mode: 'minor' },
  { title: 'Yeshu Ente Adisthanam', default_key: 'D', mode: 'minor' },
  { title: 'The Cost', artist: 'V1 Worship', default_key: 'D', mode: 'minor' },
  { title: 'Pour It Out', default_key: 'D', mode: 'minor' },
  { title: 'Let It Rain', default_key: 'D', mode: 'minor' },
  { title: 'Bride of Christ', artist: 'Worship Mob', default_key: 'D', mode: 'minor' },
  { title: 'Jehovah Jireh My Provider', default_key: 'D', mode: 'minor' },

  // ── F# major ──
  { title: 'Agnus Dei Worthy Is the Lamb', default_key: 'F#', mode: 'major' },
  { title: 'Above All Powers', default_key: 'F#', mode: 'major' },
  { title: 'God Will Make a Way', default_key: 'F#', mode: 'major' },
  { title: 'Holy Forever', default_key: 'F#', mode: 'major' },
  { title: 'The Blessing', default_key: 'F#', mode: 'major' },
  { title: 'Forever YHWH', artist: 'Elevation Worship', default_key: 'F#', mode: 'major' },
  { title: 'O Come All Ye Faithful', default_key: 'F#', mode: 'major' },
  { title: 'You Never Let Go', artist: 'Matt Redman', default_key: 'F#', mode: 'major' },
  { title: 'The Joy of the Lord Is My Strength', artist: 'Belonging Co', default_key: 'F#', mode: 'major' },
  { title: 'Shine Jesus Shine', default_key: 'F#', mode: 'major' },
  { title: 'You Are Holy', default_key: 'F#', mode: 'major' },
  { title: 'I Don\'t Want Anyone Else', default_key: 'F#', mode: 'major' },
  { title: 'The Enemy Thought He Had Me', default_key: 'F#', mode: 'major' },

  // ── D# minor ──
  { title: 'My God', artist: 'Go Fish', default_key: 'D#', mode: 'minor' },
  { title: 'Names of God', artist: 'Mercy Culture', default_key: 'D#', mode: 'minor' },
  { title: 'Father God I Wonder', default_key: 'D#', mode: 'minor' },
  { title: 'Every Knee Will Bow Every Tongue Confess', default_key: 'D#', mode: 'minor' },
  { title: 'Yeshua', default_key: 'D#', mode: 'minor' },

  // ── G major ──
  { title: 'I Worship You Almighty God', default_key: 'G', mode: 'major' },
  { title: 'I Stand Amazed in the Presence', default_key: 'G', mode: 'major' },
  { title: 'This Is My Desire', default_key: 'G', mode: 'major' },
  { title: 'Your Love Never Fails', default_key: 'G', mode: 'major' },
  { title: 'I Will Sing of Your Love Forever', default_key: 'G', mode: 'major' },
  { title: 'Jesus Thank You', default_key: 'G', mode: 'major' },
  { title: 'Well Done', default_key: 'G', mode: 'major' },
  { title: "God You're So Good", artist: 'Passion', default_key: 'G', mode: 'major' },
  { title: 'This I Believe', default_key: 'G', mode: 'major' },
  { title: 'Yahweh', artist: 'Hillsong', default_key: 'G', mode: 'major' },
  { title: 'Majesty / Here I Am', artist: 'Delirious', default_key: 'G', mode: 'major' },
  { title: 'Blessed Be the Name of the Lord', default_key: 'G', mode: 'major' },
  { title: 'Giant', artist: 'Mercy Culture', default_key: 'G', mode: 'major' },
  { title: 'Oh Praise the Name', artist: 'Hillsong', default_key: 'G', mode: 'major' },
  { title: 'Who Else Is Worthy', default_key: 'G', mode: 'major' },
  { title: 'You Are Beautiful Beyond Description', default_key: 'G', mode: 'major' },
  { title: 'Thank You for the Cross', default_key: 'G', mode: 'major' },
  { title: 'The Praise Is Yours', default_key: 'G', mode: 'major' },
  { title: 'Days of Elijah', default_key: 'G', mode: 'major' },
  { title: 'What a Faithful God Have I', default_key: 'G', mode: 'major' },
  { title: 'Lord I Come to You', default_key: 'G', mode: 'major' },
  { title: 'How Great Thou Art', default_key: 'G', mode: 'major' },
  { title: 'This Is the Air I Breathe', default_key: 'G', mode: 'major' },
  { title: 'Awesome God', default_key: 'G', mode: 'major' },
  { title: 'I Stand in Awe', artist: 'Hillsong', default_key: 'G', mode: 'major' },
  { title: 'You Are Worthy of It All', default_key: 'G', mode: 'major' },

  // ── G# major ──
  { title: 'Jesus Is the Lord', default_key: 'G#', mode: 'major' },
  { title: 'We Too Have Overcome', default_key: 'G#', mode: 'major' },
  { title: 'We Too Have Overcome', default_key: 'G#', mode: 'major' },

  // ── F minor ──
  { title: 'More Love More Power', default_key: 'F', mode: 'minor' },
  { title: 'His Mercy Is More', default_key: 'F', mode: 'minor' },

  // ── E minor ──
  { title: 'Jehovah Jireh', default_key: 'E', mode: 'minor' },
  { title: 'I Will Celebrate', default_key: 'E', mode: 'minor' },
  { title: 'Battle Song', default_key: 'E', mode: 'minor' },
  { title: 'I Enter the Holy of Holies', default_key: 'E', mode: 'minor' },
  { title: 'No One Like the Lord', default_key: 'E', mode: 'minor' },
  { title: 'Psalm 46 Lord of Hosts', default_key: 'E', mode: 'minor' },
  { title: 'Yahweh Se Manifesterai', default_key: 'E', mode: 'minor' },
  { title: 'Fortify My Faith', default_key: 'E', mode: 'minor' },
  { title: 'Fear of the Lord', artist: 'Mercy Culture', default_key: 'E', mode: 'minor' },
  { title: 'His Name Is Jesus', artist: 'Jeremy Riddle', default_key: 'E', mode: 'minor' },
  { title: 'Come Lord Come Soon', default_key: 'E', mode: 'minor' },
  { title: 'Missionary Anthem', artist: 'YWAM Kona', default_key: 'E', mode: 'minor' },
  { title: 'Famous For', default_key: 'E', mode: 'minor' },
  { title: 'More Love More Power', default_key: 'E', mode: 'minor' },
]

// Deduplicate by normalized title (keep first occurrence)
function dedup(songs: ImportSong[]): ImportSong[] {
  const seen = new Set<string>()
  return songs.filter((s) => {
    const key = s.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const UNIQUE_SONGS = dedup(SONGS)

type Result = { title: string; status: 'added' | 'skipped' | 'error'; error?: string }

export default function ImportPage() {
  const supabase = useSupabase()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [progress, setProgress] = useState(0)

  const runImport = async () => {
    if (!user) return
    setRunning(true)
    setResults([])
    setProgress(0)

    // Fetch existing song titles to avoid duplicates
    const { data: existing } = await supabase.from('songs').select('title')
    const existingTitles = new Set(
      (existing ?? []).map((s: { title: string }) => s.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
    )

    const newResults: Result[] = []

    for (let i = 0; i < UNIQUE_SONGS.length; i++) {
      const song = UNIQUE_SONGS[i]
      const normalised = song.title.toLowerCase().replace(/[^a-z0-9]/g, '')

      if (existingTitles.has(normalised)) {
        newResults.push({ title: song.title, status: 'skipped' })
        setProgress(Math.round(((i + 1) / UNIQUE_SONGS.length) * 100))
        setResults([...newResults])
        continue
      }

      const { error } = await supabase.from('songs').insert({
        title: song.title,
        artist: song.artist ?? null,
        default_key: song.default_key ?? null,
        mode: song.mode ?? null,
        created_by: user.id,
      })

      if (error) {
        newResults.push({ title: song.title, status: 'error', error: error.message })
      } else {
        newResults.push({ title: song.title, status: 'added' })
        existingTitles.add(normalised)
      }

      setProgress(Math.round(((i + 1) / UNIQUE_SONGS.length) * 100))
      setResults([...newResults])
    }

    setRunning(false)
    setDone(true)
  }

  const added = results.filter((r) => r.status === 'added').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const errors = results.filter((r) => r.status === 'error').length

  if (authLoading) return null

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm w-full">
          <p className="text-[var(--fg)] font-semibold">Sign in required</p>
          <p className="text-sm text-[var(--fg-muted)] mt-1">You must be signed in to import songs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pb-12 max-w-lg mx-auto">
      <div className="pt-12 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent-500/15 flex items-center justify-center mb-4">
          <Music2 className="w-6 h-6 text-accent-400" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--fg)]">Song Library Import</h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1">
          Imports {UNIQUE_SONGS.length} songs from your worship library PDF. Already-existing songs are skipped.
        </p>
      </div>

      {!running && !done && (
        <div className="glass-card p-6 space-y-4">
          <p className="text-sm text-[var(--fg-muted)]">
            This will add up to <span className="font-semibold text-[var(--fg)]">{UNIQUE_SONGS.length} songs</span> to
            the shared library — each with its key and mode pre-filled where known.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/songs')}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={runImport}
              className="flex-1 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors active:scale-95"
            >
              Start Import
            </button>
          </div>
        </div>
      )}

      {running && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-accent-400 animate-spin shrink-0" />
            <p className="text-sm font-medium text-[var(--fg)]">Importing… {progress}%</p>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-input)]">
            <div
              className="h-2 rounded-full bg-accent-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--fg-muted)]">
            {added} added · {skipped} skipped · {errors} errors
          </p>
        </div>
      )}

      {done && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-3 border border-emerald-500/20">
            <p className="font-semibold text-emerald-400">Import complete!</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-500/10 rounded-xl p-3">
                <p className="text-xl font-bold text-emerald-400">{added}</p>
                <p className="text-xs text-[var(--fg-muted)]">Added</p>
              </div>
              <div className="bg-[var(--bg-input)] rounded-xl p-3">
                <p className="text-xl font-bold text-[var(--fg)]">{skipped}</p>
                <p className="text-xs text-[var(--fg-muted)]">Skipped</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3">
                <p className="text-xl font-bold text-red-400">{errors}</p>
                <p className="text-xs text-[var(--fg-muted)]">Errors</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/songs')}
              className="w-full py-2.5 rounded-xl bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors"
            >
              View Song Library
            </button>
          </div>

          {/* Result list */}
          <div className="glass-card divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                {r.status === 'added' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {r.status === 'skipped' && <div className="w-4 h-4 rounded-full border border-[var(--border)] shrink-0" />}
                {r.status === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <p className="text-xs text-[var(--fg)] truncate flex-1">{r.title}</p>
                <span className="text-[10px] text-[var(--fg-subtle)] shrink-0">
                  {r.status === 'added' ? 'new' : r.status === 'skipped' ? 'exists' : 'err'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
